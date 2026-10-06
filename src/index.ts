import { Hono } from 'hono'
import { csrf } from 'hono/csrf'
import { requireOwner } from './auth'
import type { AppEnv } from './env'
import { api } from './routes/api'
import { bookings } from './routes/bookings'
import { home } from './routes/home'
import { settings } from './routes/settings'

const app = new Hono<AppEnv>()

// Unauthenticated liveness check. Everything else is owner-only.
app.get('/health', (c) => c.json({ ok: true }))

app.use('*', requireOwner)
app.use('*', csrf())

app.route('/', home)
app.route('/bookings', bookings)
app.route('/settings', settings)
app.route('/api', api)

export default app
