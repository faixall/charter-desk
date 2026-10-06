import { Hono } from 'hono'
import { bookingsBetween, bookingsNeedingAction, getSettings } from '../db'
import type { AppEnv } from '../env'
import { attentionFor } from '../lib/attention'
import { layoutWeek } from '../lib/calendar'
import { addDays, isDateString, startOfWeek, todayIn, zonedToUtc } from '../lib/time'
import { Calendar } from '../views/calendar'
import { Home } from '../views/home'

export const home = new Hono<AppEnv>()

/** UTC instant of local midnight at the start of `date`. */
const midnight = (date: string, tz: string) => zonedToUtc(date, '00:00', tz)!.toISOString()

home.get('/', async (c) => {
  const db = c.env.DB
  const { timezone: tz } = await getSettings(db)
  const now = new Date()
  const today = todayIn(tz, now)
  const tomorrow = addDays(today, 1)

  const [upcoming, pending] = await Promise.all([
    bookingsBetween(db, midnight(today, tz), midnight(addDays(today, 2), tz)),
    bookingsNeedingAction(db),
  ])

  const needsAction = pending
    .map((booking) => ({ booking, attention: attentionFor(booking, now)! }))
    .filter((x) => x.attention)
    .sort((a, b) => a.attention.sortKey - b.attention.sortKey || a.booking.start_at.localeCompare(b.booking.start_at))

  const tomorrowStart = midnight(tomorrow, tz)
  const days = [
    { date: today, label: 'Today', bookings: upcoming.filter((b) => b.start_at < tomorrowStart) },
    { date: tomorrow, label: 'Tomorrow', bookings: upcoming.filter((b) => b.start_at >= tomorrowStart) },
  ]

  return c.html(<Home days={days} needsAction={needsAction} timezone={tz} />)
})

home.get('/calendar', async (c) => {
  const { timezone: tz } = await getSettings(c.env.DB)
  const today = todayIn(tz)
  const requested = c.req.query('week') ?? ''
  const monday = startOfWeek(isDateString(requested) ? requested : today)
  const rows = await bookingsBetween(c.env.DB, midnight(monday, tz), midnight(addDays(monday, 7), tz))
  return c.html(<Calendar monday={monday} today={today} week={layoutWeek(monday, rows, tz)} />)
})
