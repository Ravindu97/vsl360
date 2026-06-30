import prisma from './database';
import logger from '../utils/logger';
import { generateUniquePublicRef } from '../utils/publicRef';
import { TIMELINE_STAGE_LABELS } from '../utils/inquiryLabels';

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

  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "QuoteStatus" AS ENUM ('NEW', 'CONTACTED', 'QUOTED');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$
    `);
  } catch (e) {
    logger.warn('Inquiry migration (QuoteStatus enum) skipped or failed', e);
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CustomItineraryRequest" (
        "id" TEXT NOT NULL,
        "publicRef" TEXT,
        "arrivalDate" TEXT,
        "departureDate" TEXT,
        "durationDays" INTEGER,
        "adults" INTEGER NOT NULL,
        "children" INTEGER NOT NULL DEFAULT 0,
        "travelStyles" TEXT[] NOT NULL,
        "accommodation" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "phone" TEXT,
        "specialRequests" TEXT,
        "status" "QuoteStatus" NOT NULL DEFAULT 'NEW',
        "adminNotes" TEXT,
        "assignedTo" TEXT,
        "contactedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CustomItineraryRequest_pkey" PRIMARY KEY ("id")
      )
    `);
  } catch (e) {
    logger.warn('Inquiry migration (CustomItineraryRequest table) skipped or failed', e);
  }

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "CustomItineraryRequest"
        ADD COLUMN IF NOT EXISTS "publicRef" TEXT,
        ADD COLUMN IF NOT EXISTS "adminNotes" TEXT,
        ADD COLUMN IF NOT EXISTS "assignedTo" TEXT,
        ADD COLUMN IF NOT EXISTS "contactedAt" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    `);
  } catch (e) {
    logger.warn('Inquiry migration (CustomItineraryRequest columns) skipped or failed', e);
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "InquiryTimelineEvent" (
        "id" TEXT NOT NULL,
        "inquiryId" TEXT NOT NULL,
        "stage" TEXT NOT NULL,
        "label" TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "InquiryTimelineEvent_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "InquiryTimelineEvent_inquiryId_fkey"
          FOREIGN KEY ("inquiryId") REFERENCES "CustomItineraryRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
  } catch (e) {
    logger.warn('Inquiry migration (InquiryTimelineEvent table) skipped or failed', e);
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "CustomItineraryRequest_publicRef_key"
        ON "CustomItineraryRequest"("publicRef")
        WHERE "publicRef" IS NOT NULL
    `);
  } catch (e) {
    logger.warn('Inquiry migration (publicRef unique index) skipped or failed', e);
  }

  await backfillInquiryPublicRefs();
}

async function backfillInquiryPublicRefs(): Promise<void> {
  try {
    const nullRefs = await prisma.$queryRaw<Array<{ id: string; createdAt: Date }>>`
      SELECT "id", "createdAt" FROM "CustomItineraryRequest" WHERE "publicRef" IS NULL
    `;

    for (const row of nullRefs) {
      const publicRef = await generateUniquePublicRef();
      await prisma.customItineraryRequest.update({
        where: { id: row.id },
        data: { publicRef },
      });

      const eventCount = await prisma.inquiryTimelineEvent.count({
        where: { inquiryId: row.id },
      });
      if (eventCount === 0) {
        await prisma.inquiryTimelineEvent.create({
          data: {
            inquiryId: row.id,
            stage: 'RECEIVED',
            label: TIMELINE_STAGE_LABELS.RECEIVED,
            createdAt: row.createdAt,
          },
        });
      }
    }

    if (nullRefs.length > 0) {
      logger.info(`Backfilled publicRef for ${nullRefs.length} inquiry record(s)`);
    }
  } catch (e) {
    logger.warn('Inquiry backfill (publicRef) skipped or failed', e);
  }
}
