import type { BookingWithCustomer } from '../db'
import type { Attention } from '../lib/attention'
import { addMinutes, formatDateTime, formatDay, formatTime } from '../lib/time'
import { BookingCard } from './bookings'
import { Layout } from './layout'

export type HomeDay = { date: string; label: string; bookings: BookingWithCustomer[] }

function timeRange(b: BookingWithCustomer, tz: string) {
  return `${formatTime(b.start_at, tz)}–${formatTime(addMinutes(new Date(b.start_at), b.duration_min).toISOString(), tz)}`
}

export function Home(props: {
  days: HomeDay[]
  needsAction: { booking: BookingWithCustomer; attention: Attention }[]
  timezone: string
}) {
  const { days, needsAction, timezone: tz } = props
  return (
    <Layout title="Home" section="home">
      {needsAction.length > 0 && (
        <section>
          <h2 style="margin-top:4px">Needs action · {needsAction.length}</h2>
          {needsAction.map(({ booking, attention }) => (
            <BookingCard booking={booking} heading={formatDateTime(booking.start_at, tz)} reason={attention} />
          ))}
        </section>
      )}
      {days.map((day) => (
        <section>
          <h2>
            <span>
              {day.label} · {formatDay(day.date)}
            </span>
            <a href={`/bookings/new?date=${day.date}`}>+ Add</a>
          </h2>
          {day.bookings.length === 0 && <p class="muted">No charters.</p>}
          {day.bookings.map((b) => (
            <BookingCard booking={b} heading={timeRange(b, tz)} />
          ))}
        </section>
      ))}
      <p>
        <a href="/calendar">Full week →</a>
      </p>
    </Layout>
  )
}
