-- Suggested PostgreSQL schema for itinerary data
CREATE TABLE IF NOT EXISTS destinations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geocoded_at TIMESTAMPTZ
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

-- Cached road / straight-line distances between destinations (OSRM, ORS, or Haversine)
CREATE TABLE IF NOT EXISTS destination_distances (
  from_destination_id TEXT NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  to_destination_id TEXT NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  driving_meters INTEGER,
  driving_duration_s INTEGER,
  straight_meters INTEGER NOT NULL,
  source TEXT NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (from_destination_id, to_destination_id)
);

-- Seed destinations from itinerary.destinations.yaml
-- Seed activities from itinerary.activities.yaml
