import type { BookingWithCustomer } from '../db'
import type { WeekLayout } from '../lib/calendar'
import { STATUS_LABELS } from '../lib/status'
import { addDays, formatDay, formatDuration } from '../lib/time'
import { Layout } from './layout'

const pad = (n: number) => String(n).padStart(2, '0')
const clock = (min: number) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`

/** "5 – 11 Oct", or "28 Sep – 4 Oct" across a month boundary. */
function weekTitle(monday: string) {
  const fmt = (d: string, month: boolean) =>
    new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', ...(month && { month: 'short' }) }).format(
      new Date(`${d}T12:00:00Z`),
    )
  const sunday = addDays(monday, 6)
  return `${fmt(monday, monday.slice(5, 7) !== sunday.slice(5, 7))} – ${fmt(sunday, true)}`
}

export function Calendar(props: { monday: string; today: string; week: WeekLayout<BookingWithCustomer> }) {
  const { monday, today, week } = props
  const { fromMin, toMin } = week.range
  const span = toMin - fromMin
  const hours = span / 60
  const pct = (min: number) => `${(((min - fromMin) / span) * 100).toFixed(3)}%`
  const tickEvery = hours > 14 ? 3 : 2
  const ticks: number[] = []
  for (let m = fromMin; m <= toMin; m += tickEvery * 60) ticks.push(m)

  return (
    <Layout title="Calendar" section="calendar">
      <div class="weeknav">
        <h1>{weekTitle(monday)}</h1>
        <a class="btn" href={`/calendar?week=${addDays(monday, -7)}`} aria-label="Previous week">
          ‹
        </a>
        <a class="btn" href="/calendar">
          Today
        </a>
        <a class="btn" href={`/calendar?week=${addDays(monday, 7)}`} aria-label="Next week">
          ›
        </a>
      </div>
      <div class="hours">
        {ticks.map((m, i) => (
          <span class={i > 0 && m === toMin ? 'last' : ''} style={`left:${pct(m)}`}>
            {clock(m)}
          </span>
        ))}
      </div>
      {week.map((day) => (
        <div class={`day${day.date === today ? ' today' : ''}`}>
          <div class="day-head">
            <span>{formatDay(day.date)}</span>
            <a href={`/bookings/new?date=${day.date}`} aria-label={`Add booking on ${formatDay(day.date)}`}>
              +
            </a>
          </div>
          <div class="tl" style={`--hours:${hours}`}>
            {day.blocks.map(({ booking: b, startMin, endMin }) => (
              <a
                class={`blk ${b.status}`}
                href={`/bookings/${b.id}`}
                style={`left:${pct(startMin)};width:calc(${pct(endMin)} - ${pct(startMin)})`}
                title={`${clock(startMin)} · ${formatDuration(b.duration_min)} · ${b.customer_name} · ${b.party_size} pax · ${STATUS_LABELS[b.status]}`}
              >
                <span>{clock(startMin).replace(/^0/, '')}</span>
                <span>{b.customer_name.split(' ')[0]}</span>
              </a>
            ))}
          </div>
        </div>
      ))}
      <div class="legend">
        <span>
          <i style="background:var(--accent)"></i>Booked
        </span>
        <span>
          <i style="background:var(--warn-bg);border:1px solid var(--warn-border)"></i>Awaiting payment
        </span>
        <span>
          <i style="border:2px dashed var(--accent)"></i>Request
        </span>
      </div>
    </Layout>
  )
}
