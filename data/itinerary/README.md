# Itinerary Data Conversion

This folder stores normalized itinerary data for database seeding.

## Files Produced

- itinerary.destinations.yaml
- itinerary.activities.yaml
- itinerary.bundle.yaml
- schema.sql
- seed.sql

## Run Conversion

From repository root:

node scripts/convert-itinerary-csv-to-yaml.mjs itineary_details.csv data/itinerary

## Suggested Database Tables

Use schema.sql as a starter:

- destinations
- destination_activities

## Seed PostgreSQL

After generating files:

1. Run schema.sql
2. Run seed.sql

Example:

psql "$DATABASE_URL" -f data/itinerary/schema.sql
psql "$DATABASE_URL" -f data/itinerary/seed.sql

## Existing databases (coordinates + distance cache)

If the database was created from an older `schema.sql`, add columns and the distance table:

psql "$DATABASE_URL" -f data/itinerary/migration_001_destination_coords_and_distances.sql

The API also runs the same `ALTER`/`CREATE` on server startup (see `runItineraryMigrations` in the backend) when the `destinations` table already exists.

## Notes

- The converter normalizes destination names into stable slugs.
- Activity IDs and destination IDs are generated as deterministic sequence codes.
- Category is auto-inferred from title/description keywords.
- Seasonal flag is inferred when text contains words like seasonal or best during.
