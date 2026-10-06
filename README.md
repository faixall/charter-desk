# Charter Desk

Internal booking tool for a single speedboat charter operator: log charter requests, confirm them, send Stripe payment links, and run the boat's schedule from a phone.

Stack: Cloudflare Workers + D1, Stripe Payment Links, mobile-first PWA.

See [docs/SPEC.md](docs/SPEC.md) for the full v1 spec and build order.

## Development

```sh
npm install
cp .dev.vars.example .dev.vars   # runs locally with the login check off
npm run db:migrate:local         # create local D1 tables
npm run dev                      # http://localhost:8787
npm run typecheck
npm test
```

## Deployment

- **Database:** D1 `charter-desk` (Asia-Pacific). Apply new migrations with `npm run db:migrate:remote`.
- **Deploys:** Workers Builds, connected to this repo — every push to `main` runs `npx wrangler deploy`.
- **Login:** Cloudflare Access on the `workers.dev` URL. The Worker also verifies the Access token itself
  and only allows `OWNER_EMAIL`. Set `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` in `wrangler.toml`; until both
  are set every request gets 401.
