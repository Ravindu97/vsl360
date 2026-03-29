-- AlterTable
ALTER TABLE "TransportPlan" ADD COLUMN     "vehicleIdNumber" TEXT,
ADD COLUMN     "wheelchairRequired" BOOLEAN NOT NULL DEFAULT false;
