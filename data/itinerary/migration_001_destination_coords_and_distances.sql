-- One-time migration for existing databases (idempotent)
ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;

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
