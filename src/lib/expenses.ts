export const EXPENSE_CATEGORIES = ['fuel', 'maintenance', 'accessories', 'other'] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  fuel: 'Fuel',
  maintenance: 'Maintenance',
  accessories: 'Accessories',
  other: 'Other',
}

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(value)
}

/** Which optional detail fields each category records. */
export const CATEGORY_FIELDS: Record<ExpenseCategory, { litres: boolean; engineHours: boolean }> = {
  fuel: { litres: true, engineHours: true },
  maintenance: { litres: false, engineHours: true },
  accessories: { litres: false, engineHours: false },
  other: { litres: false, engineHours: false },
}

/** Positive decimal ("45", "45.5", "45,5") or null. */
export function parsePositiveDecimal(input: string, max = 1_000_000): number | null {
  const v = input.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(v)) return null
  const n = Number(v)
  return n > 0 && n <= max ? Math.round(n * 100) / 100 : null
}

/** Cents per litre, or null when either side is missing. */
export function pricePerLitreCents(amountCents: number, litres: number | null): number | null {
  if (!litres) return null
  return Math.round(amountCents / litres)
}

// Months are "YYYY-MM" strings in the boat's timezone.

export function isMonthString(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return d.toISOString().slice(0, 7)
}

export function firstDay(month: string): string {
  return `${month}-01`
}

/** e.g. "October 2026" */
export function formatMonth(month: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(
    new Date(`${month}-01T12:00:00Z`),
  )
}

export type ExpenseLike = { category: ExpenseCategory; amount_cents: number; fuel_litres: number | null }

export type MonthSummary = {
  totalCents: number
  byCategory: Record<ExpenseCategory, number>
  fuelLitres: number
  avgFuelPerLitreCents: number | null
}

export function summarizeExpenses(expenses: ExpenseLike[]): MonthSummary {
  const byCategory = { fuel: 0, maintenance: 0, accessories: 0, other: 0 }
  let fuelLitres = 0
  let fuelCentsWithLitres = 0
  for (const e of expenses) {
    byCategory[e.category] += e.amount_cents
    if (e.category === 'fuel' && e.fuel_litres) {
      fuelLitres += e.fuel_litres
      fuelCentsWithLitres += e.amount_cents
    }
  }
  return {
    totalCents: Object.values(byCategory).reduce((a, b) => a + b, 0),
    byCategory,
    fuelLitres: Math.round(fuelLitres * 100) / 100,
    // Only fills that recorded litres count towards the average price.
    avgFuelPerLitreCents: fuelLitres ? Math.round(fuelCentsWithLitres / fuelLitres) : null,
  }
}
