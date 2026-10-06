-- Seasons repeat every year, so store month-day ("07-01") instead of full dates.
-- A season may wrap past New Year (start_md > end_md, e.g. 12-20 → 01-06).
DROP TABLE seasons;

CREATE TABLE seasons (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  start_md    TEXT NOT NULL CHECK (start_md GLOB '[01][0-9]-[0-3][0-9]'),
  end_md      TEXT NOT NULL CHECK (end_md GLOB '[01][0-9]-[0-3][0-9]'),
  multiplier  REAL NOT NULL DEFAULT 1.0 CHECK (multiplier > 0)
);
