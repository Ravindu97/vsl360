-- AlterTable
ALTER TABLE "Booking"
ADD COLUMN "includeActivities" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "includeTransport" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "includeHotel" BOOLEAN NOT NULL DEFAULT true;
