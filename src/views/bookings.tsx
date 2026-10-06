import type { BookingFilter, BookingWithCustomer, Settings } from '../db'
import { centsToInput, formatCents } from '../lib/money'
import { whatsappUrl } from '../lib/phone'
import { SOURCES, SOURCE_LABELS, STATUS_LABELS, availableActions, type Status } from '../lib/status'
import { formatDateTime, formatDuration } from '../lib/time'
import { Layout } from './layout'

function Badge({ status }: { status: Status }) {
  return <span class={`badge ${status}`}>{STATUS_LABELS[status]}</span>
}

const TABS: [BookingFilter, string][] = [
  ['upcoming', 'Upcoming'],
  ['requests', 'Requests'],
  ['past', 'Past & closed'],
]

export function BookingList(props: { bookings: BookingWithCustomer[]; filter: BookingFilter; settings: Settings }) {
  const { bookings, filter, settings } = props
  return (
    <Layout title="Bookings">
      <nav class="tabs">
        {TABS.map(([key, label]) => (
          <a href={`/bookings?filter=${key}`} class={key === filter ? 'on' : ''}>
            {label}
          </a>
        ))}
      </nav>
      {bookings.length === 0 && <p class="muted">Nothing here yet.</p>}
      {bookings.map((b) => (
        <a class="card" href={`/bookings/${b.id}`}>
          <div class="row">
            <strong>{formatDateTime(b.start_at, settings.timezone)}</strong>
            <Badge status={b.status} />
          </div>
          <div class="row muted">
            <span>
              {b.customer_name} · {b.party_size} pax · {formatDuration(b.duration_min)}
            </span>
            <span>{formatCents(b.final_price_cents, b.currency)}</span>
          </div>
        </a>
      ))}
    </Layout>
  )
}

export type BookingFormValues = {
  name: string
  phone: string
  email: string
  date: string
  time: string
  duration_min: string
  party_size: string
  source: string
  notes: string
}

export const EMPTY_FORM: BookingFormValues = {
  name: '',
  phone: '',
  email: '',
  date: '',
  time: '',
  duration_min: '120',
  party_size: '',
  source: 'whatsapp',
  notes: '',
}

const DURATIONS = [60, 120, 180, 240, 360, 480]

// Looks up the phone number as it's typed and pre-fills a returning customer's details.
const lookupScript = `
(() => {
  const phone = document.querySelector('[name=phone]');
  const name = document.querySelector('[name=name]');
  const email = document.querySelector('[name=email]');
  const hint = document.getElementById('phone-hint');
  let timer;
  phone.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (phone.value.replace(/\\D/g, '').length < 6) { hint.textContent = ''; return; }
      const res = await fetch('/api/customers/lookup?phone=' + encodeURIComponent(phone.value));
      const c = res.ok ? await res.json() : null;
      if (!c) { hint.textContent = 'New customer'; return; }
      hint.textContent = 'Returning customer · ' + c.booking_count + ' booking' + (c.booking_count === 1 ? '' : 's');
      if (!name.value) name.value = c.name;
      if (!email.value && c.email) email.value = c.email;
    }, 300);
  });
})();
`

export function BookingForm(props: {
  action: string
  title: string
  values: BookingFormValues
  errors?: string[]
  clashes?: BookingWithCustomer[]
  settings: Settings
}) {
  const { values: v, errors, clashes, settings } = props
  const durations = DURATIONS.includes(Number(v.duration_min)) ? DURATIONS : [...DURATIONS, Number(v.duration_min)]
  return (
    <Layout title={props.title}>
      <h1>{props.title}</h1>
      {errors && errors.length > 0 && (
        <div class="alert error">
          {errors.map((e) => (
            <div>{e}</div>
          ))}
        </div>
      )}
      <form method="post" action={props.action}>
        {clashes && clashes.length > 0 && (
          <div class="alert">
            <strong>Overlaps with:</strong>
            {clashes.map((c) => (
              <div>
                {formatDateTime(c.start_at, settings.timezone)} · {formatDuration(c.duration_min)} · {c.customer_name} (
                {STATUS_LABELS[c.status]})
              </div>
            ))}
            <div class="muted">Includes the {settings.turnaround_buffer_min} min turnaround after each trip.</div>
            <button class="btn block" name="force" value="1" style="margin-top:10px">
              Save anyway
            </button>
          </div>
        )}
        <label for="phone">Phone</label>
        <input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="off" required value={v.phone} />
        <div class="hint" id="phone-hint"></div>
        <label for="name">Name</label>
        <input id="name" name="name" required value={v.name} />
        <div class="grid2">
          <div>
            <label for="date">Date</label>
            <input id="date" name="date" type="date" required value={v.date} />
          </div>
          <div>
            <label for="time">Start</label>
            <input id="time" name="time" type="time" step="900" required value={v.time} />
          </div>
          <div>
            <label for="duration_min">Duration</label>
            <select id="duration_min" name="duration_min">
              {durations.map((d) => (
                <option value={String(d)} selected={String(d) === v.duration_min}>
                  {formatDuration(d)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label for="party_size">People</label>
            <input id="party_size" name="party_size" type="number" inputmode="numeric" min="1" required value={v.party_size} />
          </div>
        </div>
        <label for="source">Came in via</label>
        <select id="source" name="source">
          {SOURCES.map((s) => (
            <option value={s} selected={s === v.source}>
              {SOURCE_LABELS[s]}
            </option>
          ))}
        </select>
        <label for="notes">Notes</label>
        <textarea id="notes" name="notes" placeholder="Birthday, wants Blue Lagoon stop…">
          {v.notes}
        </textarea>
        <label for="email">Email (optional)</label>
        <input id="email" name="email" type="email" value={v.email} />
        <div class="actions">
          <button class="btn primary block">Save</button>
        </div>
      </form>
      <script dangerouslySetInnerHTML={{ __html: lookupScript }} />
    </Layout>
  )
}

const ACTION_BUTTONS = {
  decline: 'Decline',
  mark_paid: 'Mark as paid',
  complete: 'Mark completed',
} as const

export function BookingDetail(props: { booking: BookingWithCustomer; settings: Settings; error?: string }) {
  const { booking: b, settings, error } = props
  const tz = settings.timezone
  const actions = availableActions(b.status)
  return (
    <Layout title={b.customer_name}>
      {error && <div class="alert error">{error}</div>}
      <div class="row">
        <h1>{formatDateTime(b.start_at, tz)}</h1>
        <Badge status={b.status} />
      </div>
      <div class="card">
        <dl>
          <dt>Customer</dt>
          <dd>{b.customer_name}</dd>
          <dt>Phone</dt>
          <dd>
            <a href={`tel:${b.customer_phone}`}>{b.customer_phone}</a> ·{' '}
            <a href={whatsappUrl(b.customer_phone)}>WhatsApp</a>
          </dd>
          {b.customer_email && (
            <>
              <dt>Email</dt>
              <dd>{b.customer_email}</dd>
            </>
          )}
          <dt>Duration</dt>
          <dd>{formatDuration(b.duration_min)}</dd>
          <dt>People</dt>
          <dd>{b.party_size}</dd>
          <dt>Via</dt>
          <dd>{SOURCE_LABELS[b.source]}</dd>
          <dt>Price</dt>
          <dd>{formatCents(b.final_price_cents, b.currency)}</dd>
          {b.payment_expires_at && b.status === 'awaiting_payment' && (
            <>
              <dt>Pay by</dt>
              <dd>{formatDateTime(b.payment_expires_at, tz)}</dd>
            </>
          )}
          {b.paid_at && (
            <>
              <dt>Paid</dt>
              <dd>{formatDateTime(b.paid_at, tz)}</dd>
            </>
          )}
          {b.notes && (
            <>
              <dt>Notes</dt>
              <dd style="white-space:pre-wrap">{b.notes}</dd>
            </>
          )}
          {b.cancelled_reason && (
            <>
              <dt>Cancelled</dt>
              <dd>{b.cancelled_reason}</dd>
            </>
          )}
        </dl>
      </div>

      <div class="actions">
        {actions.includes('confirm') && (
          <form method="post" action={`/bookings/${b.id}/status`}>
            <input type="hidden" name="action" value="confirm" />
            <input
              name="price"
              inputmode="decimal"
              placeholder={`Price (${b.currency})`}
              required
              value={centsToInput(b.final_price_cents ?? b.suggested_price_cents)}
            />
            <button class="btn primary">Confirm</button>
          </form>
        )}
        {(Object.keys(ACTION_BUTTONS) as (keyof typeof ACTION_BUTTONS)[])
          .filter((a) => actions.includes(a))
          .map((a) => (
            <form method="post" action={`/bookings/${b.id}/status`}>
              <input type="hidden" name="action" value={a} />
              <button class={`btn block ${a === 'decline' ? 'danger' : a === 'mark_paid' ? 'primary' : ''}`}>
                {ACTION_BUTTONS[a]}
              </button>
            </form>
          ))}
        {b.status !== 'completed' && b.status !== 'cancelled' && (
          <a class="btn block" href={`/bookings/${b.id}/edit`}>
            Edit / reschedule
          </a>
        )}
        {actions.includes('cancel') && (
          <form method="post" action={`/bookings/${b.id}/status`}>
            <input type="hidden" name="action" value="cancel" />
            <input name="reason" placeholder="Reason (e.g. weather)" />
            <button class="btn danger">Cancel</button>
          </form>
        )}
      </div>
    </Layout>
  )
}
