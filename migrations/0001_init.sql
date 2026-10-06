-- Charter Desk v1 schema. Money is stored in integer cents; timestamps as ISO-8601 UTC text.

CREATE TABLE customers (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL UNIQUE,
  email       TEXT,
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE bookings (
  id                       INTEGER PRIMARY KEY,
  boat_id                  INTEGER NOT NULL DEFAULT 1,
  customer_id              INTEGER NOT NULL REFERENCES customers(id),
  start_at                 TEXT NOT NULL,
  duration_min             INTEGER NOT NULL CHECK (duration_min > 0),
  party_size               INTEGER NOT NULL CHECK (party_size > 0),
  status                   TEXT NOT NULL DEFAULT 'requested'
                           CHECK (status IN ('requested','declined','awaiting_payment','expired','booked','completed','cancelled')),
  source                   TEXT NOT NULL DEFAULT 'other'
                           CHECK (source IN ('whatsapp','phone','instagram','walk_in','other')),
  notes                    TEXT,
  suggested_price_cents    INTEGER,
  final_price_cents        INTEGER,
  currency                 TEXT NOT NULL DEFAULT 'EUR',
  stripe_payment_link_id   TEXT,
  stripe_payment_link_url  TEXT,
  payment_expires_at       TEXT,
  paid_at                  TEXT,
  refund_amount_cents      INTEGER,
  cancelled_reason         TEXT,
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX bookings_start_at ON bookings (boat_id, start_at);
CREATE INDEX bookings_status ON bookings (status);
CREATE INDEX bookings_customer ON bookings (customer_id);

CREATE TABLE price_list (
  id            INTEGER PRIMARY KEY,
  boat_id       INTEGER NOT NULL DEFAULT 1,
  duration_min  INTEGER NOT NULL CHECK (duration_min > 0),
  price_cents   INTEGER NOT NULL CHECK (price_cents >= 0),
  UNIQUE (boat_id, duration_min)
);

CREATE TABLE seasons (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  start_date  TEXT NOT NULL,  -- YYYY-MM-DD, inclusive
  end_date    TEXT NOT NULL,  -- YYYY-MM-DD, inclusive
  multiplier  REAL NOT NULL DEFAULT 1.0 CHECK (multiplier > 0)
);

-- Single-row settings table.
CREATE TABLE settings (
  id                      INTEGER PRIMARY KEY CHECK (id = 1),
  turnaround_buffer_min   INTEGER NOT NULL DEFAULT 30,
  payment_link_ttl_hours  INTEGER NOT NULL DEFAULT 24,
  currency                TEXT NOT NULL DEFAULT 'EUR',
  timezone                TEXT NOT NULL DEFAULT 'Europe/Athens'
);

INSERT INTO settings (id) VALUES (1);
