-- CreateEnum
CREATE TYPE "InquirySource" AS ENUM ('WHATSAPP');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'CONVERTED', 'DISCARDED');

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "source" "InquirySource" NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "waMessageId" TEXT,
    "waPhoneNumberId" TEXT,
    "fromPhone" TEXT NOT NULL,
    "waProfileName" TEXT,
    "messageBody" TEXT NOT NULL,
    "rawPayload" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedUserId" TEXT,
    "convertedBookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Inquiry_waMessageId_key" ON "Inquiry"("waMessageId");

-- CreateIndex
CREATE INDEX "Inquiry_status_receivedAt_idx" ON "Inquiry"("status", "receivedAt");

-- CreateIndex
CREATE INDEX "Inquiry_fromPhone_idx" ON "Inquiry"("fromPhone");

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_convertedBookingId_fkey" FOREIGN KEY ("convertedBookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
