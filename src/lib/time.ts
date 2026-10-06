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
