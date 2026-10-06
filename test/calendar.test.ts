import { describe, expect, it } from 'vitest'
import { addDays, formatDay, formatRelative, isDateString, startOfWeek, todayIn } from '../src/lib/time'
import { layoutWeek } from '../src/lib/calendar'
import { attentionFor } from '../src/lib/attention'

describe('date helpers', () => {
  it('adds days across months and DST changes', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('finds the Monday of a week', () => {
    expect(startOfWeek('2026-10-06')).toBe('2026-10-05') // Tuesday
    expect(startOfWeek('2026-10-11')).toBe('2026-10-05') // Sunday
    expect(startOfWeek('2026-10-05')).toBe('2026-10-05') // Monday
  })
  it('gets today in the boat timezone, not UTC', () => {
    // 22:30 UTC on 6 Oct is already 7 Oct in Athens.
    expect(todayIn('Europe/Athens', new Date('2026-10-06T22:30:00Z'))).toBe('2026-10-07')
  })
  it('formats and validates', () => {
    expect(formatDay('2026-10-06')).toBe('Tue 6 Oct')
    expect(isDateString('2026-10-06')).toBe(true)
    expect(isDateString('06/10/2026')).toBe(false)
  })
  it('formats relative times', () => {
    const now = new Date('2026-10-06T12:00:00Z')
    expect(formatRelative('2026-10-06T17:00:00Z', now)).toBe('in 5h')
    expect(formatRelative('2026-10-06T11:20:00Z', now)).toBe('40m ago')
    expect(formatRelative('2026-10-09T12:00:00Z', now)).toBe('in 3d')
  })
})

describe('week layout', () => {
  const tz = 'Europe/Athens'
  const b = (id: number, start_at: string, duration_min: number) => ({ id, start_at, duration_min })

  it('places bookings on their local day', () => {
    // 22:00 UTC Monday = 01:00 Tuesday in Athens.
    const days = layoutWeek('2026-10-05', [b(1, '2026-10-05T22:00:00.000Z', 60)], tz)
    expect(days[0].blocks).toHaveLength(0)
    expect(days[1].blocks).toHaveLength(1)
    expect(days[1].blocks[0].startMin).toBe(60)
  })

  it('widens the visible hours to fit early and late trips', () => {
    const days = layoutWeek('2026-10-05', [b(1, '2026-10-06T03:00:00.000Z', 60), b(2, '2026-10-07T18:30:00.000Z', 120)], tz)
    // 06:00 local start, 23:30 local end → 06:00–24:00
    expect(days.range).toEqual({ fromMin: 6 * 60, toMin: 24 * 60 })
  })

  it('clips a trip that runs past midnight', () => {
    const days = layoutWeek('2026-10-05', [b(1, '2026-10-05T19:00:00.000Z', 240)], tz) // 22:00–02:00 local
    expect(days[0].blocks[0].endMin).toBe(24 * 60)
  })

  it('keeps the default 07:00–21:00 window when everything fits', () => {
    const days = layoutWeek('2026-10-05', [b(1, '2026-10-06T07:00:00.000Z', 120)], tz)
    expect(days.range).toEqual({ fromMin: 7 * 60, toMin: 21 * 60 })
    expect(days).toHaveLength(7)
    expect(days[6].date).toBe('2026-10-11')
  })
})

describe('needs-action labels', () => {
  const now = new Date('2026-10-06T12:00:00Z')
  const base = { start_at: '2026-10-08T09:00:00Z', duration_min: 120, payment_expires_at: null }
  it('labels requests and stale requests', () => {
    expect(attentionFor({ ...base, status: 'requested' }, now)).toMatchObject({ urgent: false, label: 'New request · trip in 45h' })
    expect(attentionFor({ ...base, status: 'requested', start_at: '2026-10-05T09:00:00Z' }, now)?.urgent).toBe(true)
  })
  it('labels unpaid and overdue confirmations', () => {
    expect(attentionFor({ ...base, status: 'awaiting_payment', payment_expires_at: '2026-10-06T17:00:00Z' }, now)?.label).toBe(
      'Awaiting payment · due in 5h',
    )
    expect(attentionFor({ ...base, status: 'awaiting_payment', payment_expires_at: '2026-10-06T10:00:00Z' }, now)?.urgent).toBe(true)
  })
  it('only flags booked trips once they are over', () => {
    expect(attentionFor({ ...base, status: 'booked' }, now)).toBeNull()
    expect(attentionFor({ ...base, status: 'booked', start_at: '2026-10-06T09:00:00Z' }, now)?.label).toBe('Trip finished — mark completed')
    expect(attentionFor({ ...base, status: 'booked', start_at: '2026-10-06T11:00:00Z' }, now)).toBeNull() // still out on the water
  })
})
