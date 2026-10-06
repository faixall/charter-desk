import { Hono } from 'hono'
import { findCustomerByPhone } from '../db'
import type { AppEnv } from '../env'
import { isValidPhone, normalizePhone } from '../lib/phone'

export const api = new Hono<AppEnv>()

api.get('/me', (c) => c.json({ email: c.get('userEmail') }))

api.get('/customers/lookup', async (c) => {
  const phone = normalizePhone(c.req.query('phone') ?? '')
  if (!isValidPhone(phone)) return c.json(null)
  return c.json(await findCustomerByPhone(c.env.DB, phone))
})
