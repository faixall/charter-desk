import { Hono, type Context } from 'hono'
import {
  deletePriceTier,
  deleteSeason,
  getSettings,
  insertSeason,
  listPriceTiers,
  listSeasons,
  updateSettings,
  upsertPriceTier,
} from '../db'
import type { AppEnv } from '../env'
import { parseMoneyToCents } from '../lib/money'
import { parseHoursToMinutes, parseMultiplier } from '../lib/pricing'
import { SettingsPage } from '../views/settings'

export const settings = new Hono<AppEnv>()

function timezones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return []
  }
}

function isValidTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

async function render(c: Context<AppEnv>, extra: { error?: string; saved?: boolean } = {}) {
  const db = c.env.DB
  const [s, tiers, seasons] = await Promise.all([getSettings(db), listPriceTiers(db), listSeasons(db)])
  return c.html(
    <SettingsPage settings={s} tiers={tiers} seasons={seasons} timezones={timezones()} {...extra} />,
    extra.error ? 422 : 200,
  )
}

const back = (c: Context<AppEnv>) => c.redirect('/settings?saved=1', 303)

const field = (body: Record<string, unknown>, key: string) => (typeof body[key] === 'string' ? (body[key] as string).trim() : '')

function parseId(raw: string): number | null {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

/** Day + month fields → "MM-DD", rejecting dates that never exist (29 Feb is allowed). */
function parseMonthDay(day: string, month: string): string | null {
  const d = Number(day)
  const m = Number(month)
  if (!Number.isInteger(d) || !Number.isInteger(m) || m < 1 || m > 12 || d < 1) return null
  const daysInMonth = new Date(Date.UTC(2024, m, 0)).getUTCDate() // 2024 is a leap year
  if (d > daysInMonth) return null
  return `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

settings.get('/', (c) => render(c, { saved: c.req.query('saved') === '1' }))

settings.post('/prices', async (c) => {
  const body = await c.req.parseBody()
  const minutes = parseHoursToMinutes(field(body, 'hours'))
  const cents = parseMoneyToCents(field(body, 'price'))
  if (!minutes) return render(c, { error: 'Enter the trip length in hours, e.g. 2 or 1.5.' })
  if (cents == null || cents === 0) return render(c, { error: 'Enter a price, e.g. 450.' })
  await upsertPriceTier(c.env.DB, minutes, cents)
  return back(c)
})

settings.post('/prices/:id/delete', async (c) => {
  const id = parseId(c.req.param('id'))
  if (id) await deletePriceTier(c.env.DB, id)
  return back(c)
})

settings.post('/seasons', async (c) => {
  const body = await c.req.parseBody()
  const name = field(body, 'name')
  const start_md = parseMonthDay(field(body, 'start_day'), field(body, 'start_month'))
  const end_md = parseMonthDay(field(body, 'end_day'), field(body, 'end_month'))
  const multiplier = parseMultiplier(field(body, 'multiplier'))
  if (!name) return render(c, { error: 'Give the season a name.' })
  if (!start_md || !end_md) return render(c, { error: 'Check the season’s start and end dates.' })
  if (!multiplier) return render(c, { error: 'Enter the price change as a percentage (+20%) or multiplier (1.2).' })
  await insertSeason(c.env.DB, { name, start_md, end_md, multiplier })
  return back(c)
})

settings.post('/seasons/:id/delete', async (c) => {
  const id = parseId(c.req.param('id'))
  if (id) await deleteSeason(c.env.DB, id)
  return back(c)
})

settings.post('/general', async (c) => {
  const body = await c.req.parseBody()
  const buffer = Number(field(body, 'turnaround_buffer_min'))
  const ttl = Number(field(body, 'payment_link_ttl_hours'))
  const currency = field(body, 'currency').toUpperCase()
  const timezone = field(body, 'timezone')
  if (!Number.isInteger(buffer) || buffer < 0 || buffer > 240) return render(c, { error: 'Turnaround must be 0–240 minutes.' })
  if (!Number.isInteger(ttl) || ttl < 1 || ttl > 168) return render(c, { error: 'Payment window must be 1–168 hours.' })
  if (!/^[A-Z]{3}$/.test(currency)) return render(c, { error: 'Currency must be a 3-letter code like EUR.' })
  if (!isValidTimezone(timezone)) return render(c, { error: 'Pick a timezone from the list, e.g. Europe/Athens.' })
  await updateSettings(c.env.DB, {
    turnaround_buffer_min: buffer,
    payment_link_ttl_hours: ttl,
    currency,
    timezone,
  })
  return back(c)
})
