import { describe, expect, it } from 'vitest'
import {
  addMonths,
  formatMonth,
  isMonthString,
  parsePositiveDecimal,
  pricePerLitreCents,
  summarizeExpenses,
} from '../src/lib/expenses'

describe('expense inputs', () => {
  it('parses positive decimals', () => {
    expect(parsePositiveDecimal('45')).toBe(45)
    expect(parsePositiveDecimal('45,5')).toBe(45.5)
    expect(parsePositiveDecimal('0')).toBeNull()
    expect(parsePositiveDecimal('-3')).toBeNull()
    expect(parsePositiveDecimal('lots')).toBeNull()
  })
  it('works out price per litre', () => {
    expect(pricePerLitreCents(9600, 50)).toBe(192)
    expect(pricePerLitreCents(9600, null)).toBeNull()
  })
})

describe('months', () => {
  it('steps across year boundaries', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
  })
  it('validates and formats', () => {
    expect(isMonthString('2026-10')).toBe(true)
    expect(isMonthString('2026-13')).toBe(false)
    expect(formatMonth('2026-10')).toBe('October 2026')
  })
})

describe('monthly summary', () => {
  it('totals by category and averages fuel price over fills with litres', () => {
    const s = summarizeExpenses([
      { category: 'fuel', amount_cents: 9600, fuel_litres: 50 },
      { category: 'fuel', amount_cents: 20000, fuel_litres: 100 },
      { category: 'fuel', amount_cents: 5000, fuel_litres: null }, // no litres → excluded from average
      { category: 'maintenance', amount_cents: 35000, fuel_litres: null },
      { category: 'accessories', amount_cents: 4500, fuel_litres: null },
    ])
    expect(s.byCategory).toEqual({ fuel: 34600, maintenance: 35000, accessories: 4500, other: 0 })
    expect(s.totalCents).toBe(74100)
    expect(s.fuelLitres).toBe(150)
    expect(s.avgFuelPerLitreCents).toBe(197) // 296.00 / 150 L
  })
  it('handles an empty month', () => {
    expect(summarizeExpenses([])).toMatchObject({ totalCents: 0, fuelLitres: 0, avgFuelPerLitreCents: null })
  })
})
