-- CreateEnum
CREATE TYPE "CurrencyCode" AS ENUM ('EUR', 'USD', 'INR');

-- AlterTable
ALTER TABLE "Client"
ADD COLUMN "preferredCurrency" "CurrencyCode" NOT NULL DEFAULT 'USD';
