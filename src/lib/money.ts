// "250", "250.5", "250,50" → 25050. Returns null for anything else.
export function parseMoneyToCents(input: string): number | null {
  const m = input.trim().replace(',', '.').match(/^(\d+)(?:\.(\d{1,2}))?$/)
  if (!m) return null
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'))
}

export function formatCents(cents: number | null | undefined, currency: string): string {
  if (cents == null) return '—'
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(cents / 100)
}

export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return ''
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2)
}
