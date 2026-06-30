-- Inquiry tracking: publicRef, updatedAt, timeline events

ALTER TABLE "CustomItineraryRequest"
  ADD COLUMN IF NOT EXISTS "publicRef" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "InquiryTimelineEvent" (
  "id" TEXT NOT NULL,
  "inquiryId" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InquiryTimelineEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InquiryTimelineEvent_inquiryId_fkey"
    FOREIGN KEY ("inquiryId") REFERENCES "CustomItineraryRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "InquiryTimelineEvent_inquiryId_createdAt_idx"
  ON "InquiryTimelineEvent"("inquiryId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "CustomItineraryRequest_publicRef_key"
  ON "CustomItineraryRequest"("publicRef")
  WHERE "publicRef" IS NOT NULL;
