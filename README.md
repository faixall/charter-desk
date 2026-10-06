# Charter Desk

Internal booking tool for a single speedboat charter operator: log charter requests, confirm them, send Stripe payment links, and run the boat's schedule from a phone.

Stack: Cloudflare Workers + D1, Stripe Payment Links, mobile-first PWA.

See [docs/SPEC.md](docs/SPEC.md) for the full v1 spec and build order.

## Development

```sh
npm install
npm run db:migrate:local   # create local D1 tables
npm run dev                # http://localhost:8787 (auth bypassed in dev)
npm run typecheck
npm test
```

## Deploying

1. `npx wrangler d1 create charter-desk` and put the returned `database_id` in `wrangler.toml`.
2. `npm run db:migrate:remote`
3. In Cloudflare Zero Trust, create an Access application for the Worker's hostname allowing only the owner's email; copy the team domain and AUD tag into `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD`.
4. Set `ENVIRONMENT = "production"` and `npm run deploy`.
