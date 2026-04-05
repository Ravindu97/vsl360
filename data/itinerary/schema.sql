-- Suggested PostgreSQL schema for itinerary data
CREATE TABLE IF NOT EXISTS destinations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS destination_activities (
  id TEXT PRIMARY KEY,
  destination_id TEXT NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  is_seasonal BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL,
  source_row INTEGER
);

-- Seed destinations from itinerary.destinations.yaml
-- Seed activities from itinerary.activities.yaml
