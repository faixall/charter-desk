import type { PriceTierRow, Settings } from '../db'
import { formatCents } from '../lib/money'
import { formatMultiplier, type Season } from '../lib/pricing'
import { formatDuration } from '../lib/time'
import { Layout } from './layout'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "07-01" → "1 Jul" */
export function formatMonthDay(md: string) {
  const [m, d] = md.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}

function MonthDay(props: { prefix: string }) {
  return (
    <div class="md">
      <input name={`${props.prefix}_day`} type="number" inputmode="numeric" min="1" max="31" placeholder="Day" required />
      <select name={`${props.prefix}_month`} required>
        {MONTHS.map((m, i) => (
          <option value={String(i + 1).padStart(2, '0')}>{m}</option>
        ))}
      </select>
    </div>
  )
}

function DeleteButton(props: { action: string; label: string }) {
  return (
    <form method="post" action={props.action} class="inline">
      <button class="btn danger small" aria-label={props.label}>
        Remove
      </button>
    </form>
  )
}

export function SettingsPage(props: {
  settings: Settings
  tiers: PriceTierRow[]
  seasons: Season[]
  timezones: string[]
  error?: string
  saved?: boolean
}) {
  const { settings: s, tiers, seasons, error, saved } = props
  return (
    <Layout title="Settings" section="settings">
      <h1>Settings</h1>
      {error && <div class="alert error">{error}</div>}
      {saved && <div class="alert ok">Saved.</div>}

      <h2>Price list</h2>
      <p class="muted">
        Price for the whole boat by trip length. Lengths in between are worked out from the nearest prices; longer trips
        use the longest price’s hourly rate.
      </p>
      {tiers.length === 0 && <p class="muted">No prices yet — add your usual trip lengths below.</p>}
      {tiers.map((t) => (
        <div class="card row">
          <span>
            <strong>{formatDuration(t.duration_min)}</strong>
          </span>
          <span class="row" style="align-items:center">
            {formatCents(t.price_cents, s.currency)}
            <DeleteButton action={`/settings/prices/${t.id}/delete`} label={`Remove ${formatDuration(t.duration_min)} price`} />
          </span>
        </div>
      ))}
      <form method="post" action="/settings/prices" class="card">
        <div class="grid2">
          <div>
            <label for="hours">Hours</label>
            <input id="hours" name="hours" inputmode="decimal" placeholder="e.g. 4" required />
          </div>
          <div>
            <label for="price">Price ({s.currency})</label>
            <input id="price" name="price" inputmode="decimal" placeholder="e.g. 450" required />
          </div>
        </div>
        <div class="actions">
          <button class="btn primary block">Add or update price</button>
        </div>
      </form>

      <h2>Seasons</h2>
      <p class="muted">
        Repeat every year and adjust the suggested price, e.g. +20% in high season. If seasons overlap, the biggest change
        wins.
      </p>
      {seasons.map((se) => (
        <div class="card row">
          <span>
            <strong>{se.name}</strong>
            <div class="muted">
              {formatMonthDay(se.start_md)} – {formatMonthDay(se.end_md)}
            </div>
          </span>
          <span class="row" style="align-items:center">
            {formatMultiplier(se.multiplier)}
            <DeleteButton action={`/settings/seasons/${se.id}/delete`} label={`Remove ${se.name}`} />
          </span>
        </div>
      ))}
      <form method="post" action="/settings/seasons" class="card">
        <label for="season_name">Name</label>
        <input id="season_name" name="name" placeholder="High season" required />
        <div class="grid2">
          <div>
            <label>From</label>
            <MonthDay prefix="start" />
          </div>
          <div>
            <label>To (inclusive)</label>
            <MonthDay prefix="end" />
          </div>
        </div>
        <label for="multiplier">Price change</label>
        <input id="multiplier" name="multiplier" placeholder="+20% or 1.2" required />
        <div class="actions">
          <button class="btn primary block">Add season</button>
        </div>
      </form>

      <h2>General</h2>
      <form method="post" action="/settings/general" class="card">
        <div class="grid2">
          <div>
            <label for="turnaround_buffer_min">Turnaround (min)</label>
            <input
              id="turnaround_buffer_min"
              name="turnaround_buffer_min"
              type="number"
              min="0"
              max="240"
              required
              value={String(s.turnaround_buffer_min)}
            />
          </div>
          <div>
            <label for="payment_link_ttl_hours">Pay within (hours)</label>
            <input
              id="payment_link_ttl_hours"
              name="payment_link_ttl_hours"
              type="number"
              min="1"
              max="168"
              required
              value={String(s.payment_link_ttl_hours)}
            />
          </div>
        </div>
        <label for="currency">Currency</label>
        <input id="currency" name="currency" maxlength={3} required value={s.currency} style="text-transform:uppercase" />
        <div class="hint">Applies to new bookings. Existing bookings keep their currency.</div>
        <label for="timezone">Timezone</label>
        <input id="timezone" name="timezone" list="timezones" required value={s.timezone} />
        <datalist id="timezones">
          {props.timezones.map((tz) => (
            <option value={tz} />
          ))}
        </datalist>
        <div class="actions">
          <button class="btn primary block">Save</button>
        </div>
      </form>
    </Layout>
  )
}

