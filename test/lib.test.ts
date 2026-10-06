import { describe, expect, it } from 'vitest'
import { normalizePhone, isValidPhone, whatsappUrl } from '../src/lib/phone'
import { parseMoneyToCents, centsToInput } from '../src/lib/money'
import { zonedToUtc, utcToZoned, formatDuration } from '../src/lib/time'
import { findClashes } from '../src/lib/clash'
import { availableActions, nextStatus } from '../src/lib/status'

describe('phone', () => {
  it('normalizes common formats to one key', () => {
    expect(normalizePhone('+30 694 123 4567')).toBe('+306941234567')
    expect(normalizePhone('0030-694-123-4567')).toBe('+306941234567')
    expect(normalizePhone('(694) 123 4567')).toBe('6941234567')
  })
  it('validates and builds WhatsApp links', () => {
    expect(isValidPhone('+12')).toBe(false)
    expect(isValidPhone('+306941234567')).toBe(true)
    expect(whatsappUrl('+306941234567')).toBe('https://wa.me/306941234567')
  })
})

describe('money', () => {
  it('parses euros to cents', () => {
    expect(parseMoneyToCents('250')).toBe(25000)
    expect(parseMoneyToCents('250.5')).toBe(25050)
    expect(parseMoneyToCents('250,05')).toBe(25005)
    expect(parseMoneyToCents('-5')).toBeNull()
    expect(parseMoneyToCents('abc')).toBeNull()
    expect(parseMoneyToCents('1.234')).toBeNull()
  })
  it('round-trips for form inputs', () => {
    expect(centsToInput(25000)).toBe('250')
    expect(centsToInput(25050)).toBe('250.50')
  })
})

describe('time', () => {
  const tz = 'Europe/Athens'
  it('converts local summer and winter times to UTC', () => {
    expect(zonedToUtc('2026-07-15', '14:00', tz)!.toISOString()).toBe('2026-07-15T11:00:00.000Z')
    expect(zonedToUtc('2026-12-15', '14:00', tz)!.toISOString()).toBe('2026-12-15T12:00:00.000Z')
  })
  it('handles the day DST ends', () => {
    // Athens leaves summer time at 04:00 local on 25 Oct 2026.
    expect(zonedToUtc('2026-10-25', '10:00', tz)!.toISOString()).toBe('2026-10-25T08:00:00.000Z')
  })
  it('round-trips', () => {
    expect(utcToZoned('2026-07-15T11:00:00.000Z', tz)).toEqual({ date: '2026-07-15', time: '14:00' })
  })
  it('rejects bad input', () => {
    expect(zonedToUtc('2026-7-15', '14:00', tz)).toBeNull()
    expect(zonedToUtc('2026-07-15', '2pm', tz)).toBeNull()
  })
  it('formats durations', () => {
    expect(formatDuration(120)).toBe('2h')
    expect(formatDuration(90)).toBe('1h 30m')
    expect(formatDuration(45)).toBe('45m')
  })
})

describe('clash detection', () => {
  const existing = [{ id: 1, start_at: '2026-07-15T09:00:00.000Z', duration_min: 120 }] // 09–11 (+30 buffer → 11:30)
  const at = (iso: string) => new Date(iso)
  it('flags overlap including the turnaround buffer', () => {
    expect(findClashes({ start: at('2026-07-15T10:00:00.000Z'), durationMin: 60 }, existing, 30)).toHaveLength(1)
    expect(findClashes({ start: at('2026-07-15T11:15:00.000Z'), durationMin: 60 }, existing, 30)).toHaveLength(1)
    // New trip ending (with buffer) right as the existing one starts is fine.
    expect(findClashes({ start: at('2026-07-15T07:30:00.000Z'), durationMin: 60 }, existing, 30)).toHaveLength(0)
  })
  it('allows back-to-back once the buffer has passed', () => {
    expect(findClashes({ start: at('2026-07-15T11:30:00.000Z'), durationMin: 60 }, existing, 30)).toHaveLength(0)
  })
  it('ignores the booking being edited', () => {
    expect(findClashes({ id: 1, start: at('2026-07-15T09:30:00.000Z'), durationMin: 60 }, existing, 30)).toHaveLength(0)
  })
})

describe('status transitions', () => {
  it('follows the booking lifecycle', () => {
    expect(nextStatus('requested', 'confirm')).toBe('awaiting_payment')
    expect(nextStatus('awaiting_payment', 'mark_paid')).toBe('booked')
    expect(nextStatus('booked', 'complete')).toBe('completed')
  })
  it('rejects invalid moves', () => {
    expect(nextStatus('requested', 'complete')).toBeNull()
    expect(nextStatus('cancelled', 'confirm')).toBeNull()
  })
  it('lists actions per status', () => {
    expect(availableActions('requested')).toEqual(['confirm', 'decline', 'cancel'])
    expect(availableActions('completed')).toEqual([])
  })
})
