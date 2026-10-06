export const STATUSES = [
  'requested',
  'declined',
  'awaiting_payment',
  'expired',
  'booked',
  'completed',
  'cancelled',
] as const
export type Status = (typeof STATUSES)[number]

export const SOURCES = ['whatsapp', 'phone', 'instagram', 'walk_in', 'other'] as const
export type Source = (typeof SOURCES)[number]

// Expiry (awaiting_payment → expired) happens in the scheduled job, not by hand.
const TRANSITIONS = {
  confirm: { from: ['requested'], to: 'awaiting_payment' },
  decline: { from: ['requested'], to: 'declined' },
  mark_paid: { from: ['awaiting_payment'], to: 'booked' },
  complete: { from: ['booked'], to: 'completed' },
  cancel: { from: ['requested', 'awaiting_payment', 'booked'], to: 'cancelled' },
} as const satisfies Record<string, { from: readonly Status[]; to: Status }>

export type Action = keyof typeof TRANSITIONS
export const ACTIONS = Object.keys(TRANSITIONS) as Action[]

export function isAction(value: string): value is Action {
  return value in TRANSITIONS
}

export function nextStatus(current: Status, action: Action): Status | null {
  const t = TRANSITIONS[action]
  return (t.from as readonly Status[]).includes(current) ? t.to : null
}

export function availableActions(current: Status): Action[] {
  return ACTIONS.filter((a) => nextStatus(current, a) !== null)
}

export const STATUS_LABELS: Record<Status, string> = {
  requested: 'Request',
  declined: 'Declined',
  awaiting_payment: 'Awaiting payment',
  expired: 'Expired',
  booked: 'Booked',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const SOURCE_LABELS: Record<Source, string> = {
  whatsapp: 'WhatsApp',
  phone: 'Phone',
  instagram: 'Instagram',
  walk_in: 'Walk-in',
  other: 'Other',
}
