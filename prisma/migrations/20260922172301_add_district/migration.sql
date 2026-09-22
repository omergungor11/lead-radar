-- AlterTable
ALTER TABLE "Business" ADD COLUMN "district" TEXT;

-- CreateIndex
CREATE INDEX "Business_city_district_idx" ON "Business"("city", "district");
