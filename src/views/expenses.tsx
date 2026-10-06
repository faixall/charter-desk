import type { Expense } from '../db'
import {
  CATEGORY_FIELDS,
  CATEGORY_LABELS,
  EXPENSE_CATEGORIES,
  addMonths,
  formatMonth,
  pricePerLitreCents,
  type ExpenseCategory,
  type MonthSummary,
} from '../lib/expenses'
import { formatCents } from '../lib/money'
import { formatDay } from '../lib/time'
import { Layout } from './layout'

function litres(n: number) {
  return `${n.toLocaleString('en-GB', { maximumFractionDigits: 2 })} L`
}

function ExpenseDetailLine({ e }: { e: Expense }) {
  const bits: string[] = []
  if (e.fuel_litres) {
    const ppl = pricePerLitreCents(e.amount_cents, e.fuel_litres)
    bits.push(`${litres(e.fuel_litres)}${ppl ? ` · ${formatCents(ppl, e.currency)}/L` : ''}`)
  }
  if (e.engine_hours != null) bits.push(`${e.engine_hours} engine h`)
  if (e.vendor) bits.push(e.vendor)
  return bits.length ? <div class="muted">{bits.join(' · ')}</div> : null
}

export function ExpenseList(props: {
  month: string
  category: ExpenseCategory | null
  expenses: Expense[]
  summary: MonthSummary
  income: { cents: number; trips: number }
  currency: string
}) {
  const { month, category, expenses, summary, income, currency } = props
  const net = income.cents - summary.totalCents
  const max = Math.max(...Object.values(summary.byCategory), 1)
  const q = (m: string, c: ExpenseCategory | null) => `/expenses?month=${m}${c ? `&category=${c}` : ''}`

  return (
    <Layout title="Expenses" section="expenses">
      <div class="weeknav">
        <h1>{formatMonth(month)}</h1>
        <a class="btn" href={q(addMonths(month, -1), category)} aria-label="Previous month">
          ‹
        </a>
        <a class="btn" href={q(addMonths(month, 1), category)} aria-label="Next month">
          ›
        </a>
      </div>

      <div class="card">
        <div class="row">
          <span>
            Charter income <span class="muted">· {income.trips} trips</span>
          </span>
          <strong>{formatCents(income.cents, currency)}</strong>
        </div>
        <div class="row">
          <span>Expenses</span>
          <strong>−{formatCents(summary.totalCents, currency)}</strong>
        </div>
        <div class="row net">
          <span>Net</span>
          <strong class={net < 0 ? 'neg' : ''}>{formatCents(net, currency)}</strong>
        </div>
      </div>

      <div class="card">
        {EXPENSE_CATEGORIES.map((c) => (
          <div class="catrow">
            <div class="row">
              <span>{CATEGORY_LABELS[c]}</span>
              <span>{formatCents(summary.byCategory[c], currency)}</span>
            </div>
            <div class="bar">
              <i class={`cat-${c}`} style={`width:${((summary.byCategory[c] / max) * 100).toFixed(1)}%`}></i>
            </div>
          </div>
        ))}
        {summary.fuelLitres > 0 && (
          <div class="muted" style="margin-top:8px">
            Fuel: {litres(summary.fuelLitres)}
            {summary.avgFuelPerLitreCents && ` · avg ${formatCents(summary.avgFuelPerLitreCents, currency)}/L`}
          </div>
        )}
      </div>

      <nav class="tabs">
        <a href={q(month, null)} class={category ? '' : 'on'}>
          All
        </a>
        {EXPENSE_CATEGORIES.map((c) => (
          <a href={q(month, c)} class={category === c ? 'on' : ''}>
            {CATEGORY_LABELS[c]}
          </a>
        ))}
      </nav>

      {expenses.length === 0 && <p class="muted">No expenses recorded.</p>}
      {expenses.map((e) => (
        <a class="card" href={`/expenses/${e.id}/edit`}>
          <div class="row">
            <strong>{e.description || CATEGORY_LABELS[e.category]}</strong>
            <strong>{formatCents(e.amount_cents, e.currency)}</strong>
          </div>
          <div class="row muted">
            <span>
              {formatDay(e.date)} · {CATEGORY_LABELS[e.category]}
            </span>
          </div>
          <ExpenseDetailLine e={e} />
        </a>
      ))}
    </Layout>
  )
}

export type ExpenseFormValues = {
  date: string
  category: string
  amount: string
  vendor: string
  description: string
  fuel_litres: string
  engine_hours: string
}

const PLACEHOLDERS: Record<ExpenseCategory, string> = {
  fuel: 'Fill-up',
  maintenance: 'Oil change, hull cleaning…',
  accessories: 'Life jackets, snorkel set…',
  other: 'Mooring, insurance…',
}

// Shows only the fields the chosen category uses, and a live price per litre.
const formScript = `
(() => {
  const fields = ${JSON.stringify(CATEGORY_FIELDS)};
  const placeholders = ${JSON.stringify(PLACEHOLDERS)};
  const cat = document.querySelector('[name=category]');
  const amount = document.querySelector('[name=amount]');
  const litres = document.querySelector('[name=fuel_litres]');
  const desc = document.querySelector('[name=description]');
  const ppl = document.getElementById('ppl');
  const num = (el) => Number(el.value.replace(',', '.'));
  function update() {
    const f = fields[cat.value];
    document.getElementById('f-litres').hidden = !f.litres;
    document.getElementById('f-hours').hidden = !f.engineHours;
    desc.placeholder = placeholders[cat.value];
    const a = num(amount), l = num(litres);
    ppl.textContent = f.litres && a > 0 && l > 0 ? (a / l).toFixed(3) + ' per litre' : '';
  }
  [cat, amount, litres].forEach((el) => el.addEventListener('input', update));
  update();
  document.querySelector('form.delete')?.addEventListener('submit', (e) => {
    if (!confirm('Delete this expense?')) e.preventDefault();
  });
})();
`

export function ExpenseForm(props: {
  action: string
  title: string
  values: ExpenseFormValues
  currency: string
  error?: string
  deleteAction?: string
}) {
  const { values: v, currency, error } = props
  const cat = (EXPENSE_CATEGORIES as readonly string[]).includes(v.category) ? (v.category as ExpenseCategory) : 'fuel'
  return (
    <Layout title={props.title} section="expenses">
      <h1>{props.title}</h1>
      {error && <div class="alert error">{error}</div>}
      <form method="post" action={props.action}>
        <div class="grid2">
          <div>
            <label for="category">Type</label>
            <select id="category" name="category">
              {EXPENSE_CATEGORIES.map((c) => (
                <option value={c} selected={c === cat}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label for="date">Date</label>
            <input id="date" name="date" type="date" required value={v.date} />
          </div>
        </div>
        <label for="amount">Amount ({currency})</label>
        <input id="amount" name="amount" inputmode="decimal" required value={v.amount} placeholder="e.g. 96.50" />
        <div id="f-litres">
          <label for="fuel_litres">Litres</label>
          <input id="fuel_litres" name="fuel_litres" inputmode="decimal" value={v.fuel_litres} placeholder="e.g. 50" />
          <div class="hint" id="ppl"></div>
        </div>
        <div id="f-hours">
          <label for="engine_hours">Engine hours (optional)</label>
          <input id="engine_hours" name="engine_hours" inputmode="decimal" value={v.engine_hours} placeholder="Hour meter reading" />
        </div>
        <label for="description">What</label>
        <input id="description" name="description" value={v.description} placeholder={PLACEHOLDERS[cat]} />
        <label for="vendor">Where / supplier (optional)</label>
        <input id="vendor" name="vendor" value={v.vendor} placeholder="Marina fuel dock, chandlery…" />
        <div class="actions">
          <button class="btn primary block">Save</button>
        </div>
      </form>
      {props.deleteAction && (
        <form method="post" action={props.deleteAction} class="actions delete">
          <button class="btn danger block" name="confirm" value="1">
            Delete expense
          </button>
        </form>
      )}
      <script dangerouslySetInnerHTML={{ __html: formScript }} />
    </Layout>
  )
}
