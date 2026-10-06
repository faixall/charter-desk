import { Hono } from 'hono'
import { csrf } from 'hono/csrf'
import { requireOwner } from './auth'
import type { AppEnv } from './env'
import { api } from './routes/api'
import { bookings } from './routes/bookings'

const app = new Hono<AppEnv>()

// Unauthenticated liveness check. Everything else is owner-only.
app.get('/health', (c) => c.json({ ok: true }))

app.use('*', requireOwner)
app.use('*', csrf())

app.get('/', (c) => c.redirect('/bookings'))
app.route('/bookings', bookings)
app.route('/api', api)

export default app
