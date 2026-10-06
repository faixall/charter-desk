import { addMinutes } from './time'

// Statuses that actually hold the boat. Plain requests don't block anything yet.
export const BLOCKING_STATUSES = ['awaiting_payment', 'booked'] as const

export type Slot = { id: number; start_at: string; duration_min: number }

/**
 * Bookings in `existing` whose time on the water, plus the turnaround buffer
 * after each trip, overlaps the candidate's.
 */
export function findClashes<T extends Slot>(
  candidate: { id?: number; start: Date; durationMin: number },
  existing: T[],
  bufferMin: number,
): T[] {
  const aStart = candidate.start.getTime()
  const aEnd = addMinutes(candidate.start, candidate.durationMin + bufferMin).getTime()
  return existing.filter((b) => {
    if (b.id === candidate.id) return false
    const bStart = new Date(b.start_at)
    const bEnd = addMinutes(bStart, b.duration_min + bufferMin).getTime()
    return aStart < bEnd && bStart.getTime() < aEnd
  })
}
