-- Running costs of the boat. `date` is the local calendar date the money was spent.
CREATE TABLE expenses (
  id            INTEGER PRIMARY KEY,
  boat_id       INTEGER NOT NULL DEFAULT 1,
  date          TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  category      TEXT NOT NULL CHECK (category IN ('fuel','maintenance','accessories','other')),
  amount_cents  INTEGER NOT NULL CHECK (amount_cents > 0),
  currency      TEXT NOT NULL DEFAULT 'EUR',
  vendor        TEXT,
  description   TEXT,
  -- Fuel only.
  fuel_litres   REAL CHECK (fuel_litres IS NULL OR fuel_litres > 0),
  -- Fuel and maintenance: engine hour meter reading at the time.
  engine_hours  REAL CHECK (engine_hours IS NULL OR engine_hours >= 0),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX expenses_date ON expenses (boat_id, date);
