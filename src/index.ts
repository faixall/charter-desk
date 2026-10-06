import { Hono } from 'hono'
import { requireOwner } from './auth'
import type { AppEnv } from './env'

const app = new Hono<AppEnv>()

// Unauthenticated liveness check (also used by the Stripe webhook route later).
app.get('/health', (c) => c.json({ ok: true }))

app.use('/api/*', requireOwner)

app.get('/api/me', (c) => c.json({ email: c.get('userEmail') }))

app.get('/api/settings', async (c) => {
  const settings = await c.env.DB.prepare('SELECT * FROM settings WHERE id = 1').first()
  return c.json(settings)
})

export default app
