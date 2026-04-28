import prisma from './database';
import logger from '../utils/logger';

/**
 * Idempotent SQL for itinerary raw tables (not Prisma models).
 * Runs on server start so existing Docker/DB volumes get new columns without a manual psql step.
 */
export async function runItineraryMigrations(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE destinations
        ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ
    `);
  } catch (e) {
    logger.warn('Itinerary migration (destinations columns) skipped or failed', e);
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS destination_distances (
        from_destination_id TEXT NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
        to_destination_id TEXT NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
        driving_meters INTEGER,
        driving_duration_s INTEGER,
        straight_meters INTEGER NOT NULL,
        source TEXT NOT NULL,
        computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (from_destination_id, to_destination_id)
      )
    `);
  } catch (e) {
    logger.warn('Itinerary migration (destination_distances) skipped or failed', e);
  }

  logger.info('Itinerary DB migrations applied (if tables exist)');
}
