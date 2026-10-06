import { BLOCKING_STATUSES } from './lib/clash'
import type { Source, Status } from './lib/status'

export type Settings = {
  turnaround_buffer_min: number
  payment_link_ttl_hours: number
  currency: string
  timezone: string
}

export type Customer = {
  id: number
  name: string
  phone: string
  email: string | null
  notes: string | null
}

export type Booking = {
  id: number
  boat_id: number
  customer_id: number
  start_at: string
  duration_min: number
  party_size: number
  status: Status
  source: Source
  notes: string | null
  suggested_price_cents: number | null
  final_price_cents: number | null
  currency: string
  payment_expires_at: string | null
  paid_at: string | null
  cancelled_reason: string | null
  created_at: string
  updated_at: string
}

export type BookingWithCustomer = Booking & {
  customer_name: string
  customer_phone: string
  customer_email: string | null
}

export type BookingInput = {
  customerId: number
  startAt: string
  durationMin: number
  partySize: number
  source: Source
  notes: string | null
}

const BOOKING_SELECT = `
  SELECT b.*, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email
  FROM bookings b JOIN customers c ON c.id = b.customer_id`

const now = () => new Date().toISOString()

export async function getSettings(db: D1Database): Promise<Settings> {
  return (await db.prepare('SELECT * FROM settings WHERE id = 1').first<Settings>())!
}

export async function findCustomerByPhone(db: D1Database, phone: string) {
  return db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = c.id) AS booking_count
       FROM customers c WHERE phone = ?`,
    )
    .bind(phone)
    .first<Customer & { booking_count: number }>()
}

/** Phone is the identity: an existing phone keeps its customer row and updates name/email. */
export async function upsertCustomer(
  db: D1Database,
  c: { name: string; phone: string; email: string | null },
): Promise<number> {
  const row = await db
    .prepare(
      `INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)
       ON CONFLICT (phone) DO UPDATE SET name = excluded.name, email = COALESCE(excluded.email, customers.email)
       RETURNING id`,
    )
    .bind(c.name, c.phone, c.email)
    .first<{ id: number }>()
  return row!.id
}

export type BookingFilter = 'upcoming' | 'requests' | 'past'

export async function listBookings(db: D1Database, filter: BookingFilter): Promise<BookingWithCustomer[]> {
  const t = now()
  const query = {
    // Anything still live, plus today's earlier trips so they don't vanish mid-day.
    upcoming: [
      `${BOOKING_SELECT} WHERE b.status IN ('requested','awaiting_payment','booked')
       AND b.start_at >= ? ORDER BY b.start_at ASC LIMIT 200`,
      [new Date(Date.now() - 12 * 3600_000).toISOString()],
    ],
    requests: [`${BOOKING_SELECT} WHERE b.status = 'requested' ORDER BY b.start_at ASC LIMIT 200`, []],
    past: [
      `${BOOKING_SELECT} WHERE b.start_at < ? OR b.status IN ('declined','expired','completed','cancelled')
       ORDER BY b.start_at DESC LIMIT 200`,
      [t],
    ],
  } satisfies Record<BookingFilter, [string, unknown[]]>
  const [sql, params] = query[filter]
  const { results } = await db.prepare(sql).bind(...params).all<BookingWithCustomer>()
  return results
}

export async function getBooking(db: D1Database, id: number) {
  return db.prepare(`${BOOKING_SELECT} WHERE b.id = ?`).bind(id).first<BookingWithCustomer>()
}

/** Bookings holding the boat within two days either side — enough to cover any trip length. */
export async function blockingBookingsNear(db: D1Database, start: Date, boatId = 1) {
  const from = new Date(start.getTime() - 2 * 86400_000).toISOString()
  const to = new Date(start.getTime() + 2 * 86400_000).toISOString()
  const placeholders = BLOCKING_STATUSES.map(() => '?').join(',')
  const { results } = await db
    .prepare(
      `${BOOKING_SELECT} WHERE b.boat_id = ? AND b.status IN (${placeholders})
       AND b.start_at BETWEEN ? AND ? ORDER BY b.start_at`,
    )
    .bind(boatId, ...BLOCKING_STATUSES, from, to)
    .all<BookingWithCustomer>()
  return results
}

export async function insertBooking(db: D1Database, b: BookingInput): Promise<number> {
  const row = await db
    .prepare(
      `INSERT INTO bookings (customer_id, start_at, duration_min, party_size, source, notes)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
    )
    .bind(b.customerId, b.startAt, b.durationMin, b.partySize, b.source, b.notes)
    .first<{ id: number }>()
  return row!.id
}

export async function updateBooking(db: D1Database, id: number, b: BookingInput) {
  await db
    .prepare(
      `UPDATE bookings SET customer_id = ?, start_at = ?, duration_min = ?, party_size = ?,
       source = ?, notes = ?, updated_at = ? WHERE id = ?`,
    )
    .bind(b.customerId, b.startAt, b.durationMin, b.partySize, b.source, b.notes, now(), id)
    .run()
}

/**
 * Moves a booking between statuses. The `from` guard in the WHERE clause makes
 * this a no-op if someone (another tab, a webhook) changed it in the meantime.
 */
export async function transitionBooking(
  db: D1Database,
  id: number,
  from: Status,
  to: Status,
  fields: Partial<Pick<Booking, 'final_price_cents' | 'payment_expires_at' | 'paid_at' | 'cancelled_reason'>> = {},
): Promise<boolean> {
  const entries = Object.entries(fields)
  const sets = ['status = ?', 'updated_at = ?', ...entries.map(([k]) => `${k} = ?`)].join(', ')
  const result = await db
    .prepare(`UPDATE bookings SET ${sets} WHERE id = ? AND status = ?`)
    .bind(to, now(), ...entries.map(([, v]) => v), id, from)
    .run()
  return result.meta.changes === 1
}
