import { describe, expect, it } from 'vitest'
import {
  basePrice,
  formatMultiplier,
  inSeason,
  parseHoursToMinutes,
  parseMultiplier,
  seasonFor,
  suggestPrice,
} from '../src/lib/pricing'

const tiers = [
  { duration_min: 120, price_cents: 25000 },
  { duration_min: 240, price_cents: 45000 },
  { duration_min: 480, price_cents: 80000 },
]
const season = (id: number, start_md: string, end_md: string, multiplier: number) => ({
  id,
  name: `S${id}`,
  start_md,
  end_md,
  multiplier,
})

describe('base price', () => {
  it('uses exact tiers', () => {
    expect(basePrice(tiers, 240)).toEqual({ cents: 45000, exact: true })
  })
  it('interpolates between tiers', () => {
    expect(basePrice(tiers, 180)).toEqual({ cents: 35000, exact: false })
  })
  it('charges the shortest tier as a minimum', () => {
    expect(basePrice(tiers, 60)).toEqual({ cents: 25000, exact: false })
  })
  it('extends the longest tier pro rata', () => {
    expect(basePrice(tiers, 600)).toEqual({ cents: 100000, exact: false })
  })
  it('returns null with no price list', () => {
    expect(basePrice([], 120)).toBeNull()
  })
})

describe('seasons', () => {
  it('matches inclusive ranges', () => {
    expect(inSeason({ start_md: '07-01', end_md: '08-31' }, '07-01')).toBe(true)
    expect(inSeason({ start_md: '07-01', end_md: '08-31' }, '08-31')).toBe(true)
    expect(inSeason({ start_md: '07-01', end_md: '08-31' }, '09-01')).toBe(false)
  })
  it('handles seasons that wrap past New Year', () => {
    const xmas = { start_md: '12-20', end_md: '01-06' }
    expect(inSeason(xmas, '12-25')).toBe(true)
    expect(inSeason(xmas, '01-03')).toBe(true)
    expect(inSeason(xmas, '06-15')).toBe(false)
  })
  it('picks the highest multiplier when seasons overlap', () => {
    const s = [season(1, '06-01', '09-30', 1.1), season(2, '08-01', '08-20', 1.3)]
    expect(seasonFor(s, '2026-08-10')?.id).toBe(2)
    expect(seasonFor(s, '2026-06-10')?.id).toBe(1)
    expect(seasonFor(s, '2026-11-10')).toBeNull()
  })
})

describe('suggested price', () => {
  it('applies the season multiplier and rounds to whole units', () => {
    const s = [season(1, '07-01', '08-31', 1.15)]
    // 450 × 1.15 = 517.50 → 518
    expect(suggestPrice(tiers, s, 240, '2026-07-15')).toMatchObject({ cents: 51800, baseCents: 45000, exactTier: true })
    expect(suggestPrice(tiers, s, 240, '2026-10-15')).toMatchObject({ cents: 45000, season: null })
  })
})

describe('input parsing', () => {
  it('parses multipliers and percentages', () => {
    expect(parseMultiplier('1.2')).toBe(1.2)
    expect(parseMultiplier('1,25')).toBe(1.25)
    expect(parseMultiplier('20%')).toBe(1.2)
    expect(parseMultiplier('+20 %')).toBe(1.2)
    expect(parseMultiplier('-10%')).toBe(0.9)
    expect(parseMultiplier('0')).toBeNull()
    expect(parseMultiplier('lots')).toBeNull()
  })
  it('formats multipliers as percentages', () => {
    expect(formatMultiplier(1.2)).toBe('+20%')
    expect(formatMultiplier(0.9)).toBe('-10%')
    expect(formatMultiplier(1)).toBe('no change')
  })
  it('parses hours', () => {
    expect(parseHoursToMinutes('2')).toBe(120)
    expect(parseHoursToMinutes('1,5')).toBe(90)
    expect(parseHoursToMinutes('0')).toBeNull()
    expect(parseHoursToMinutes('25')).toBeNull()
  })
})
