import type { Status } from './status'
import { addMinutes, formatRelative } from './time'

type Item = { status: Status; start_at: string; duration_min: number; payment_expires_at: string | null }

export type Attention = { label: string; urgent: boolean; sortKey: number }

/** Why a booking is on the "needs action" list, or null if it isn't. */
export function attentionFor(b: Item, now = new Date()): Attention | null {
  const start = new Date(b.start_at)
  if (b.status === 'requested') {
    if (start < now) return { label: 'Request date has passed — decline or reschedule', urgent: true, sortKey: 0 }
    return { label: `New request · trip ${formatRelative(b.start_at, now)}`, urgent: false, sortKey: 1 }
  }
  if (b.status === 'awaiting_payment') {
    const due = b.payment_expires_at
    if (due && new Date(due) < now) return { label: `Payment overdue (was due ${formatRelative(due, now)})`, urgent: true, sortKey: 0 }
    return { label: due ? `Awaiting payment · due ${formatRelative(due, now)}` : 'Awaiting payment', urgent: false, sortKey: 2 }
  }
  if (b.status === 'booked' && addMinutes(start, b.duration_min) < now) {
    return { label: 'Trip finished — mark completed', urgent: false, sortKey: 3 }
  }
  return null
}
