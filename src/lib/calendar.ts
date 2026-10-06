import { addDays, utcToZoned } from './time'

const DEFAULT_FROM = 7 * 60
const DEFAULT_TO = 21 * 60
const DAY = 24 * 60

export type Block<T> = { booking: T; startMin: number; endMin: number }
export type WeekDay<T> = { date: string; blocks: Block<T>[] }
export type WeekLayout<T> = WeekDay<T>[] & { range: { fromMin: number; toMin: number } }

/**
 * Buckets bookings into the 7 local days starting at `monday`, as minute offsets
 * within each day, and picks an hour range wide enough to show all of them.
 */
export function layoutWeek<T extends { start_at: string; duration_min: number }>(
  monday: string,
  bookings: T[],
  tz: string,
): WeekLayout<T> {
  const days: WeekDay<T>[] = Array.from({ length: 7 }, (_, i) => ({ date: addDays(monday, i), blocks: [] }))
  const byDate = new Map(days.map((d) => [d.date, d]))
  let fromMin = DEFAULT_FROM
  let toMin = DEFAULT_TO

  for (const booking of bookings) {
    const local = utcToZoned(booking.start_at, tz)
    const day = byDate.get(local.date)
    if (!day) continue
    const [h, m] = local.time.split(':').map(Number)
    const startMin = h * 60 + m
    const endMin = Math.min(startMin + booking.duration_min, DAY)
    day.blocks.push({ booking, startMin, endMin })
    fromMin = Math.min(fromMin, Math.floor(startMin / 60) * 60)
    toMin = Math.max(toMin, Math.ceil(endMin / 60) * 60)
  }

  for (const d of days) d.blocks.sort((a, b) => a.startMin - b.startMin)
  return Object.assign(days, { range: { fromMin, toMin } })
}
