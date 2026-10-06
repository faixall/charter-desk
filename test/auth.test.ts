import { SignJWT } from 'jose'
import { describe, expect, it } from 'vitest'
import app from '../src/index'

const env = (over: Record<string, string> = {}) => ({
  DB: {} as D1Database,
  ENVIRONMENT: 'production',
  OWNER_EMAIL: 'owner@example.com',
  ACCESS_TEAM_DOMAIN: '',
  ACCESS_AUD: '',
  ...over,
})

async function token(claims: Record<string, unknown>) {
  return new SignJWT(claims).setProtectedHeader({ alg: 'HS256' }).sign(new TextEncoder().encode('x'.repeat(32)))
}

describe('production auth', () => {
  it('stays locked and says so before Access is configured', async () => {
    const res = await app.request('/', {}, env())
    expect(res.status).toBe(503)
    expect(await res.text()).toContain('isn’t enabled')
  })

  it('shows the Access issuer and audience to finish setup, without letting anyone in', async () => {
    const jwt = await token({ iss: 'https://team.cloudflareaccess.com', aud: ['abc123'], email: 'x@y.z' })
    const res = await app.request('/bookings', { headers: { 'Cf-Access-Jwt-Assertion': jwt } }, env())
    const html = await res.text()
    expect(res.status).toBe(503)
    expect(html).toContain('https://team.cloudflareaccess.com')
    expect(html).toContain('abc123')
    expect(html).not.toContain('Bookings')
  })

  it('escapes token values', async () => {
    const jwt = await token({ iss: '<script>x</script>', aud: 'a' })
    const html = await (await app.request('/', { headers: { 'Cf-Access-Jwt-Assertion': jwt } }, env())).text()
    expect(html).not.toContain('<script>x')
  })

  it('rejects missing and forged tokens once configured', async () => {
    const configured = env({ ACCESS_TEAM_DOMAIN: 'https://team.cloudflareaccess.com', ACCESS_AUD: 'abc123' })
    expect((await app.request('/', {}, configured)).status).toBe(401)
    // Signed with our own key, not Access's → must not verify.
    const jwt = await token({ iss: 'https://team.cloudflareaccess.com', aud: ['abc123'], email: 'owner@example.com' })
    expect((await app.request('/', { headers: { 'Cf-Access-Jwt-Assertion': jwt } }, configured)).status).toBe(401)
  })

  it('keeps /health public', async () => {
    expect((await app.request('/health', {}, env())).status).toBe(200)
  })
})
