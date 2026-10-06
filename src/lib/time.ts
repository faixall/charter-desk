// The operator works in the boat's local timezone; the DB stores UTC ISO strings.

function zonedParts(at: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at)
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value)
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

function offsetMs(at: Date, tz: string): number {
  const p = zonedParts(at, tz)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(at.getTime() / 1000) * 1000
}

/** Local wall-clock date ("YYYY-MM-DD") + time ("HH:MM") in `tz` → UTC Date. */
export function zonedToUtc(date: string, time: string, tz: string): Date | null {
  const dm = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const tm = time.match(/^(\d{2}):(\d{2})$/)
  if (!dm || !tm) return null
  const guess = Date.UTC(+dm[1], +dm[2] - 1, +dm[3], +tm[1], +tm[2])
  if (Number.isNaN(guess)) return null
  const first = offsetMs(new Date(guess), tz)
  let utc = guess - first
  // Re-check once in case the guess and the result fall on different sides of a DST change.
  const second = offsetMs(new Date(utc), tz)
  if (second !== first) utc = guess - second
  return new Date(utc)
}

/** UTC ISO string → local { date: "YYYY-MM-DD", time: "HH:MM" } in `tz`. */
export function utcToZoned(iso: string, tz: string): { date: string; time: string } {
  const p = zonedParts(new Date(iso), tz)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
    time: `${pad(p.hour)}:${pad(p.minute)}`,
  }
}

/** e.g. "Tue 7 Oct, 14:00" */
export function formatDateTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (!h) return `${m}m`
  return m ? `${h}h ${m}m` : `${h}h`
}

export function addMinutes(d: Date, min: number): Date {
  return new Date(d.getTime() + min * 60_000)
}

// Calendar-date helpers. Dates are plain "YYYY-MM-DD" strings in the boat's timezone;
// arithmetic happens at UTC noon so it never trips over DST.

function dateToUtcNoon(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12))
}

export function isDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(dateToUtcNoon(value).getTime())
}

export function todayIn(tz: string, now = new Date()): string {
  return utcToZoned(now.toISOString(), tz).date
}

export function addDays(date: string, days: number): string {
  const d = dateToUtcNoon(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Monday of the week containing `date`. */
export function startOfWeek(date: string): string {
  const dow = (dateToUtcNoon(date).getUTCDay() + 6) % 7 // 0 = Monday
  return addDays(date, -dow)
}

/** e.g. "Tue 6 Oct" */
export function formatDay(date: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(
    dateToUtcNoon(date),
  )
}

/** e.g. "14:00" */
export function formatTime(iso: string, tz: string): string {
  return utcToZoned(iso, tz).time
}

/** Coarse "in 5h" / "40m ago" style offset from `now`. */
export function formatRelative(iso: string, now = new Date()): string {
  const diffMin = Math.round((new Date(iso).getTime() - now.getTime()) / 60_000)
  const abs = Math.abs(diffMin)
  const amount = abs < 60 ? `${abs}m` : abs < 48 * 60 ? `${Math.round(abs / 60)}h` : `${Math.round(abs / 1440)}d`
  return diffMin >= 0 ? `in ${amount}` : `${amount} ago`
}
