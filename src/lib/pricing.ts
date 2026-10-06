export type PriceTier = { duration_min: number; price_cents: number }
export type Season = { id: number; name: string; start_md: string; end_md: string; multiplier: number }

export type Suggestion = {
  cents: number
  baseCents: number
  exactTier: boolean
  season: Season | null
}

/**
 * Price for a trip length from the price list. Exact tiers win; between tiers the
 * price is interpolated; shorter than the shortest tier pays that tier (minimum
 * charge); longer than the longest pays the longest tier's hourly rate.
 */
export function basePrice(tiers: PriceTier[], durationMin: number): { cents: number; exact: boolean } | null {
  if (!tiers.length) return null
  const sorted = [...tiers].sort((a, b) => a.duration_min - b.duration_min)
  const exact = sorted.find((t) => t.duration_min === durationMin)
  if (exact) return { cents: exact.price_cents, exact: true }

  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  if (durationMin < first.duration_min) return { cents: first.price_cents, exact: false }
  if (durationMin > last.duration_min) {
    return { cents: Math.round((last.price_cents * durationMin) / last.duration_min), exact: false }
  }
  const upperIdx = sorted.findIndex((t) => t.duration_min > durationMin)
  const a = sorted[upperIdx - 1]
  const b = sorted[upperIdx]
  const ratio = (durationMin - a.duration_min) / (b.duration_min - a.duration_min)
  return { cents: Math.round(a.price_cents + (b.price_cents - a.price_cents) * ratio), exact: false }
}

export function inSeason(season: Pick<Season, 'start_md' | 'end_md'>, monthDay: string): boolean {
  const { start_md: s, end_md: e } = season
  return s <= e ? monthDay >= s && monthDay <= e : monthDay >= s || monthDay <= e
}

/** The season covering a local trip date. If seasons overlap, the highest multiplier applies. */
export function seasonFor(seasons: Season[], localDate: string): Season | null {
  const md = localDate.slice(5)
  return seasons.filter((s) => inSeason(s, md)).sort((a, b) => b.multiplier - a.multiplier)[0] ?? null
}

/** Suggested price, rounded to a whole currency unit. */
export function suggestPrice(
  tiers: PriceTier[],
  seasons: Season[],
  durationMin: number,
  localDate: string,
): Suggestion | null {
  const base = basePrice(tiers, durationMin)
  if (!base) return null
  const season = seasonFor(seasons, localDate)
  // Round to cents first so float noise (450 × 1.15 = 517.4999…) can't flip the unit rounding.
  const cents = Math.round(base.cents * (season?.multiplier ?? 1))
  return { cents: Math.round(cents / 100) * 100, baseCents: base.cents, exactTier: base.exact, season }
}

/** "1.2", "1,2", "20%", "+20%" → 1.2; "-10%" → 0.9. */
export function parseMultiplier(input: string): number | null {
  const v = input.trim().replace(',', '.')
  const pct = v.match(/^([+-]?)(\d+(?:\.\d+)?)\s*%$/)
  const m = pct ? 1 + (pct[1] === '-' ? -1 : 1) * (Number(pct[2]) / 100) : /^\d+(\.\d+)?$/.test(v) ? Number(v) : NaN
  return Number.isFinite(m) && m > 0 && m <= 10 ? Math.round(m * 1000) / 1000 : null
}

export function formatMultiplier(m: number): string {
  const pct = Math.round((m - 1) * 1000) / 10
  return pct === 0 ? 'no change' : `${pct > 0 ? '+' : ''}${pct}%`
}

/** Hours as typed ("2", "1.5", "1,5") → whole minutes. */
export function parseHoursToMinutes(input: string): number | null {
  const v = Number(input.trim().replace(',', '.'))
  if (!Number.isFinite(v) || v <= 0 || v > 24) return null
  return Math.round(v * 60)
}
