import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { MiddlewareHandler } from 'hono'
import type { AppEnv } from './env'

// The app sits behind Cloudflare Access, which signs every request with a JWT.
// We verify it ourselves (not just trust the header) and allow only the owner.
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

function jwks(teamDomain: string) {
  let set = jwksCache.get(teamDomain)
  if (!set) {
    set = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`))
    jwksCache.set(teamDomain, set)
  }
  return set
}

export const requireOwner: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.env.ENVIRONMENT === 'dev') {
    c.set('userEmail', c.env.OWNER_EMAIL)
    return next()
  }

  const token = c.req.header('Cf-Access-Jwt-Assertion')
  if (!token || !c.env.ACCESS_TEAM_DOMAIN || !c.env.ACCESS_AUD) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  try {
    const { payload } = await jwtVerify(token, jwks(c.env.ACCESS_TEAM_DOMAIN), {
      issuer: c.env.ACCESS_TEAM_DOMAIN,
      audience: c.env.ACCESS_AUD,
    })
    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : ''
    if (email !== c.env.OWNER_EMAIL.toLowerCase()) {
      return c.json({ error: 'forbidden' }, 403)
    }
    c.set('userEmail', email)
  } catch {
    return c.json({ error: 'unauthorized' }, 401)
  }

  return next()
}
