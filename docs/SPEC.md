# Charter Desk — Spec (v1)

Internal booking tool for a single speedboat charter operator. Customers never use it.

## Decisions

| # | Topic | Decision |
|---|---|---|
| 1 | Business model | Single operator |
| 2 | Product | Private charters — whole boat + captain for a block of time |
| 3 | Booking flow | Request-based: operator confirms manually |
| 4 | Payment | Stripe Payment Link sent after confirmation; unpaid links expire (default 24h) |
| 5 | Audience | Operator-only internal tool, mobile-first PWA |
| 6 | Intake | Manual quick-add form (requests arrive via WhatsApp/phone/Instagram/walk-in) |
| 7 | Users | Owner only — one login |
| 8 | Pricing | Price list (duration → price, optional season multiplier), always overridable |
| 9 | Fleet | One boat (hidden `boat_id` kept for future expansion) |
| 10 | Cancellations | Case by case: cancel dialog with editable refund amount (pre-filled full), Stripe refund |
| 11 | Stack | Cloudflare Workers + D1, SvelteKit/React frontend, passkey or Cloudflare Access |
| 12 | Expenses | Fuel (litres, engine hours), maintenance (engine hours), accessories, other; monthly income vs expenses |

## Booking lifecycle

```
requested ──confirm──▶ awaiting_payment ──paid (webhook)──▶ booked ──▶ completed
    │                        │                                 │
    └─decline─▶ declined     └─link expires─▶ expired          └─cancel─▶ cancelled (refund_amount)
```

Rescheduling = editing date/time on a booking (optional "reason: weather" note).

## Data model (D1 / SQLite)

- **customers**: id, name, phone (unique, lookup key), email?, notes, created_at
- **bookings**: id, boat_id (default 1), customer_id, start_at, duration_min, party_size, status,
  source (whatsapp|phone|instagram|walk_in|other), notes,
  suggested_price_cents, final_price_cents, currency,
  stripe_payment_link_id, stripe_payment_link_url, payment_expires_at, paid_at,
  refund_amount_cents, cancelled_reason, created_at, updated_at
- **price_list**: id, boat_id, duration_min, price_cents
- **seasons**: id, name, start_md, end_md (MM-DD, repeats yearly, may wrap New Year), multiplier
- **expenses**: id, boat_id, date, category (fuel|maintenance|accessories|other), amount_cents, currency, vendor, description, fuel_litres, engine_hours
- **settings**: turnaround_buffer_min, payment_link_ttl_hours, currency, timezone

## Screens

1. **Home** — Today & tomorrow's charters; "Needs action" (unconfirmed requests, unpaid links nearing expiry); big "+ New request" button.
2. **Quick-add** — phone lookup auto-fills customer; date, start time, duration, party size, source, notes. Clash warning (non-blocking) if overlapping a confirmed/booked charter incl. turnaround buffer. Target: < 30 s from a WhatsApp chat.
3. **Booking detail** — status actions: Confirm (shows suggested price, editable → creates Stripe link, copy/share to WhatsApp), Decline, Edit/Reschedule, Cancel & refund, Mark completed.
4. **Calendar** — single-lane day/week view.
5. **Settings** — price list, seasons, buffer, link TTL, currency/timezone.
6. **Expenses** — month view: charter income (booked + completed), expenses by category, net; litres and average fuel price; add/edit/delete with fuel- and maintenance-specific fields.

## Integrations

- **Stripe**: create Payment Link on confirm (metadata: booking_id); webhook `checkout.session.completed` → `booked`; refunds via API.
- **Scheduled Worker (cron)**: expire unpaid links; daily morning summary push.
- **Web Push** (PWA): new payment received, links about to expire, morning summary.

## Out of scope (v1)

Receipt photos, public booking page, customer accounts, multiple users/roles, multiple boats UI, extras/add-ons, policy-based refunds, WhatsApp API integration, translations.

## Build order

1. Repo scaffold, Worker + D1 schema/migrations, auth
2. Customers + quick-add + booking list/detail
3. Home "today / needs action" + calendar
4. Price list + suggested pricing
5. Stripe links, webhook, refunds
6. Cron expiry, push notifications, PWA install
7. Deploy
