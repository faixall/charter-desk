import { Hono, type Context } from 'hono'
import {
  deleteExpense,
  getExpense,
  getSettings,
  incomeBetween,
  insertExpense,
  listExpenses,
  updateExpense,
  type ExpenseInput,
} from '../db'
import type { AppEnv } from '../env'
import {
  CATEGORY_FIELDS,
  addMonths,
  firstDay,
  isExpenseCategory,
  isMonthString,
  parsePositiveDecimal,
  summarizeExpenses,
} from '../lib/expenses'
import { centsToInput, parseMoneyToCents } from '../lib/money'
import { isDateString, todayIn, zonedToUtc } from '../lib/time'
import { ExpenseForm, ExpenseList, type ExpenseFormValues } from '../views/expenses'

export const expenses = new Hono<AppEnv>()

expenses.get('/', async (c) => {
  const db = c.env.DB
  const settings = await getSettings(db)
  const tz = settings.timezone
  const m = c.req.query('month') ?? ''
  const month = isMonthString(m) ? m : todayIn(tz).slice(0, 7)
  const cat = c.req.query('category') ?? ''
  const category = isExpenseCategory(cat) ? cat : null
  const from = firstDay(month)
  const to = firstDay(addMonths(month, 1))

  const [all, income] = await Promise.all([
    listExpenses(db, from, to),
    incomeBetween(db, zonedToUtc(from, '00:00', tz)!.toISOString(), zonedToUtc(to, '00:00', tz)!.toISOString()),
  ])
  const shown = category ? all.filter((e) => e.category === category) : all

  return c.html(
    <ExpenseList
      month={month}
      category={category}
      expenses={shown}
      summary={summarizeExpenses(all)}
      income={income}
      currency={settings.currency}
    />,
  )
})

function readValues(body: Record<string, unknown>): ExpenseFormValues {
  const s = (k: string) => (typeof body[k] === 'string' ? (body[k] as string).trim() : '')
  return {
    date: s('date'),
    category: s('category'),
    amount: s('amount'),
    vendor: s('vendor'),
    description: s('description'),
    fuel_litres: s('fuel_litres'),
    engine_hours: s('engine_hours'),
  }
}

function parse(v: ExpenseFormValues): { ok: true; expense: Omit<ExpenseInput, 'currency'> } | { ok: false; error: string } {
  if (!isExpenseCategory(v.category)) return { ok: false, error: 'Pick a type.' }
  if (!isDateString(v.date)) return { ok: false, error: 'Pick a date.' }
  const amount = parseMoneyToCents(v.amount)
  if (!amount) return { ok: false, error: 'Enter the amount, e.g. 96.50.' }
  const fields = CATEGORY_FIELDS[v.category]

  let fuel_litres: number | null = null
  if (fields.litres) {
    fuel_litres = parsePositiveDecimal(v.fuel_litres, 10_000)
    if (!fuel_litres) return { ok: false, error: 'Enter how many litres were filled.' }
  }
  let engine_hours: number | null = null
  if (fields.engineHours && v.engine_hours) {
    engine_hours = parsePositiveDecimal(v.engine_hours, 100_000)
    if (engine_hours == null) return { ok: false, error: 'Engine hours should be a number, e.g. 412.5.' }
  }
  return {
    ok: true,
    expense: {
      date: v.date,
      category: v.category,
      amount_cents: amount,
      vendor: v.vendor || null,
      description: v.description || null,
      fuel_litres,
      engine_hours,
    },
  }
}

function parseId(raw: string): number | null {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

const backToMonth = (c: Context<AppEnv>, date: string) => c.redirect(`/expenses?month=${date.slice(0, 7)}`, 303)

expenses.get('/new', async (c) => {
  const settings = await getSettings(c.env.DB)
  const cat = c.req.query('category') ?? ''
  const values: ExpenseFormValues = {
    date: todayIn(settings.timezone),
    category: isExpenseCategory(cat) ? cat : 'fuel',
    amount: '',
    vendor: '',
    description: '',
    fuel_litres: '',
    engine_hours: '',
  }
  return c.html(<ExpenseForm action="/expenses" title="New expense" values={values} currency={settings.currency} />)
})

expenses.post('/', async (c) => {
  const settings = await getSettings(c.env.DB)
  const values = readValues(await c.req.parseBody())
  const parsed = parse(values)
  if (!parsed.ok) {
    return c.html(
      <ExpenseForm action="/expenses" title="New expense" values={values} currency={settings.currency} error={parsed.error} />,
      422,
    )
  }
  await insertExpense(c.env.DB, { ...parsed.expense, currency: settings.currency })
  return backToMonth(c, parsed.expense.date)
})

expenses.get('/:id/edit', async (c) => {
  const id = parseId(c.req.param('id'))
  const e = id && (await getExpense(c.env.DB, id))
  if (!e) return c.notFound()
  const values: ExpenseFormValues = {
    date: e.date,
    category: e.category,
    amount: centsToInput(e.amount_cents),
    vendor: e.vendor ?? '',
    description: e.description ?? '',
    fuel_litres: e.fuel_litres == null ? '' : String(e.fuel_litres),
    engine_hours: e.engine_hours == null ? '' : String(e.engine_hours),
  }
  return c.html(
    <ExpenseForm
      action={`/expenses/${e.id}`}
      title="Edit expense"
      values={values}
      currency={e.currency}
      deleteAction={`/expenses/${e.id}/delete`}
    />,
  )
})

expenses.post('/:id', async (c) => {
  const id = parseId(c.req.param('id'))
  const existing = id && (await getExpense(c.env.DB, id))
  if (!existing) return c.notFound()
  const values = readValues(await c.req.parseBody())
  const parsed = parse(values)
  if (!parsed.ok) {
    return c.html(
      <ExpenseForm
        action={`/expenses/${existing.id}`}
        title="Edit expense"
        values={values}
        currency={existing.currency}
        error={parsed.error}
        deleteAction={`/expenses/${existing.id}/delete`}
      />,
      422,
    )
  }
  await updateExpense(c.env.DB, existing.id, parsed.expense)
  return backToMonth(c, parsed.expense.date)
})

expenses.post('/:id/delete', async (c) => {
  const id = parseId(c.req.param('id'))
  const existing = id && (await getExpense(c.env.DB, id))
  if (!existing) return c.notFound()
  await deleteExpense(c.env.DB, existing.id)
  return backToMonth(c, existing.date)
})
