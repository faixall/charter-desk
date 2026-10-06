import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose'
import type { Context, MiddlewareHandler } from 'hono'
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
  if (!c.env.ACCESS_TEAM_DOMAIN || !c.env.ACCESS_AUD) return setupPage(c, token)
  if (!token) return c.json({ error: 'unauthorized' }, 401)

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

/**
 * Shown until ACCESS_TEAM_DOMAIN / ACCESS_AUD are configured. The app stays locked;
 * if Cloudflare Access is already in front, this displays the two public values
 * from its token (issuer and audience) so they can be copied into wrangler.toml.
 */
function setupPage(c: Context<AppEnv>, token: string | undefined) {
  let issuer = ''
  let audience = ''
  if (token) {
    try {
      const claims = decodeJwt(token)
      issuer = typeof claims.iss === 'string' ? claims.iss : ''
      audience = Array.isArray(claims.aud) ? claims.aud.join(', ') : (claims.aud ?? '')
    } catch {
      // Not a JWT: fall through to the "not enabled yet" message.
    }
  }
  const esc = (v: string) => v.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`)
  const body = issuer
    ? `<h1>Almost there</h1>
       <p>Cloudflare Access is on. Send these two values to finish setup:</p>
       <p><b>Team domain</b><br><code>${esc(issuer)}</code></p>
       <p><b>AUD tag</b><br><code>${esc(audience)}</code></p>
       <p>The app stays locked until they are added.</p>`
    : `<h1>Locked</h1><p>Cloudflare Access isn’t enabled for this app yet.</p>`
  return c.html(
    `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><title>Charter Desk setup</title>
     <style>body{font:16px/1.5 system-ui,sans-serif;max-width:560px;margin:40px auto;padding:0 16px}
     code{word-break:break-all;background:#eef1f5;padding:4px 6px;border-radius:6px;display:inline-block}
     @media (prefers-color-scheme:dark){body{background:#0f1216;color:#e8ebef}code{background:#232a33}}</style>${body}`,
    503,
  )
}
