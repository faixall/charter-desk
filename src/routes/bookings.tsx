import { Hono } from 'hono'
import {
  blockingBookingsNear,
  getBooking,
  getSettings,
  insertBooking,
  listBookings,
  transitionBooking,
  updateBooking,
  upsertCustomer,
  type BookingFilter,
  type BookingInput,
  type BookingWithCustomer,
  type Settings,
} from '../db'
import type { AppEnv } from '../env'
import { findClashes } from '../lib/clash'
import { parseMoneyToCents } from '../lib/money'
import { isValidPhone, normalizePhone } from '../lib/phone'
import { SOURCES, isAction, nextStatus, type Source } from '../lib/status'
import { isDateString, utcToZoned, zonedToUtc } from '../lib/time'
import { BookingDetail, BookingForm, BookingList, EMPTY_FORM, type BookingFormValues } from '../views/bookings'

export const bookings = new Hono<AppEnv>()

const FILTERS: BookingFilter[] = ['upcoming', 'requests', 'past']

bookings.get('/', async (c) => {
  const q = c.req.query('filter') as BookingFilter
  const filter = FILTERS.includes(q) ? q : 'upcoming'
  const [settings, rows] = await Promise.all([getSettings(c.env.DB), listBookings(c.env.DB, filter)])
  return c.html(<BookingList bookings={rows} filter={filter} settings={settings} />)
})

bookings.get('/new', async (c) => {
  const settings = await getSettings(c.env.DB)
  const date = c.req.query('date') ?? ''
  const time = c.req.query('time') ?? ''
  const values = {
    ...EMPTY_FORM,
    date: isDateString(date) ? date : '',
    time: /^\d{2}:\d{2}$/.test(time) ? time : '',
  }
  return c.html(<BookingForm action="/bookings" title="New request" values={values} settings={settings} />)
})

type Parsed =
  | { ok: true; customer: { name: string; phone: string; email: string | null }; start: Date; booking: Omit<BookingInput, 'customerId' | 'startAt'> }
  | { ok: false; errors: string[] }

function parseForm(v: BookingFormValues, settings: Settings): Parsed {
  const errors: string[] = []
  const phone = normalizePhone(v.phone)
  if (!isValidPhone(phone)) errors.push('Enter a valid phone number.')
  const name = v.name.trim()
  if (!name) errors.push('Enter the customer’s name.')
  const start = zonedToUtc(v.date, v.time, settings.timezone)
  if (!start) errors.push('Pick a date and start time.')
  const durationMin = Number(v.duration_min)
  if (!Number.isInteger(durationMin) || durationMin <= 0) errors.push('Pick a duration.')
  const partySize = Number(v.party_size)
  if (!Number.isInteger(partySize) || partySize <= 0) errors.push('Enter the number of people.')
  const source = (SOURCES as readonly string[]).includes(v.source) ? (v.source as Source) : 'other'
  if (errors.length) return { ok: false, errors }
  return {
    ok: true,
    customer: { name, phone, email: v.email.trim() || null },
    start: start!,
    booking: { durationMin, partySize, source, notes: v.notes.trim() || null },
  }
}

async function readForm(c: { req: { parseBody: () => Promise<Record<string, unknown>> } }) {
  const body = await c.req.parseBody()
  const str = (k: keyof BookingFormValues) => (typeof body[k] === 'string' ? (body[k] as string) : '')
  const values: BookingFormValues = {
    name: str('name'),
    phone: str('phone'),
    email: str('email'),
    date: str('date'),
    time: str('time'),
    duration_min: str('duration_min'),
    party_size: str('party_size'),
    source: str('source'),
    notes: str('notes'),
  }
  return { values, force: body.force === '1' }
}

/** Shared create/edit handler: validate, warn on clashes unless forced, then save. */
async function save(
  db: D1Database,
  values: BookingFormValues,
  force: boolean,
  settings: Settings,
  existingId?: number,
): Promise<{ id: number } | { errors?: string[]; clashes?: BookingWithCustomer[] }> {
  const parsed = parseForm(values, settings)
  if (!parsed.ok) return { errors: parsed.errors }

  if (!force) {
    const nearby = await blockingBookingsNear(db, parsed.start)
    const clashes = findClashes(
      { id: existingId, start: parsed.start, durationMin: parsed.booking.durationMin },
      nearby,
      settings.turnaround_buffer_min,
    )
    if (clashes.length) return { clashes }
  }

  const customerId = await upsertCustomer(db, parsed.customer)
  const input: BookingInput = { ...parsed.booking, customerId, startAt: parsed.start.toISOString() }
  if (existingId) {
    await updateBooking(db, existingId, input)
    return { id: existingId }
  }
  return { id: await insertBooking(db, input) }
}

bookings.post('/', async (c) => {
  const settings = await getSettings(c.env.DB)
  const { values, force } = await readForm(c)
  const result = await save(c.env.DB, values, force, settings)
  if ('id' in result) return c.redirect(`/bookings/${result.id}`, 303)
  return c.html(<BookingForm action="/bookings" title="New request" values={values} settings={settings} {...result} />, 422)
})

function parseId(raw: string): number | null {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

bookings.get('/:id', async (c) => {
  const id = parseId(c.req.param('id'))
  const booking = id && (await getBooking(c.env.DB, id))
  if (!booking) return c.notFound()
  const settings = await getSettings(c.env.DB)
  return c.html(<BookingDetail booking={booking} settings={settings} />)
})

bookings.get('/:id/edit', async (c) => {
  const id = parseId(c.req.param('id'))
  const b = id && (await getBooking(c.env.DB, id))
  if (!b) return c.notFound()
  const settings = await getSettings(c.env.DB)
  const local = utcToZoned(b.start_at, settings.timezone)
  const values: BookingFormValues = {
    name: b.customer_name,
    phone: b.customer_phone,
    email: b.customer_email ?? '',
    date: local.date,
    time: local.time,
    duration_min: String(b.duration_min),
    party_size: String(b.party_size),
    source: b.source,
    notes: b.notes ?? '',
  }
  return c.html(<BookingForm action={`/bookings/${b.id}`} title="Edit booking" values={values} settings={settings} />)
})

bookings.post('/:id', async (c) => {
  const id = parseId(c.req.param('id'))
  if (!id || !(await getBooking(c.env.DB, id))) return c.notFound()
  const settings = await getSettings(c.env.DB)
  const { values, force } = await readForm(c)
  const result = await save(c.env.DB, values, force, settings, id)
  if ('id' in result) return c.redirect(`/bookings/${id}`, 303)
  return c.html(
    <BookingForm action={`/bookings/${id}`} title="Edit booking" values={values} settings={settings} {...result} />,
    422,
  )
})

bookings.post('/:id/status', async (c) => {
  const id = parseId(c.req.param('id'))
  const booking = id && (await getBooking(c.env.DB, id))
  if (!booking) return c.notFound()
  const settings = await getSettings(c.env.DB)
  const body = await c.req.parseBody()
  const action = typeof body.action === 'string' ? body.action : ''
  const fail = (error: string) => c.html(<BookingDetail booking={booking} settings={settings} error={error} />, 422)

  if (!isAction(action)) return fail('Unknown action.')
  const to = nextStatus(booking.status, action)
  if (!to) return fail('That action isn’t possible for this booking any more.')

  const fields: Parameters<typeof transitionBooking>[4] = {}
  if (action === 'confirm') {
    const cents = parseMoneyToCents(typeof body.price === 'string' ? body.price : '')
    if (cents == null || cents === 0) return fail('Enter the price before confirming.')
    fields.final_price_cents = cents
    fields.payment_expires_at = new Date(Date.now() + settings.payment_link_ttl_hours * 3600_000).toISOString()
  } else if (action === 'mark_paid') {
    fields.paid_at = new Date().toISOString()
  } else if (action === 'cancel') {
    fields.cancelled_reason = (typeof body.reason === 'string' && body.reason.trim()) || 'Cancelled'
  }

  const changed = await transitionBooking(c.env.DB, booking.id, booking.status, to, fields)
  if (!changed) return fail('This booking was changed elsewhere — reload and try again.')
  return c.redirect(`/bookings/${booking.id}`, 303)
})
