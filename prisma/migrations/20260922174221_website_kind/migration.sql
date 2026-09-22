-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Business" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "placeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primaryType" TEXT,
    "types" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "phone" TEXT,
    "phoneE164" TEXT,
    "websiteUri" TEXT,
    "websiteKind" TEXT NOT NULL DEFAULT 'NONE',
    "email" TEXT,
    "rating" REAL,
    "userRatingCount" INTEGER,
    "photos" TEXT NOT NULL,
    "reviews" TEXT NOT NULL,
    "openingHours" TEXT,
    "googleMapsUri" TEXT,
    "lat" REAL,
    "lng" REAL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "scoreBreakdown" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "lastContactedAt" DATETIME,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "searchJobId" TEXT,
    CONSTRAINT "Business_searchJobId_fkey" FOREIGN KEY ("searchJobId") REFERENCES "SearchJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Business" ("address", "city", "district", "email", "firstSeenAt", "googleMapsUri", "id", "lastContactedAt", "lastSyncedAt", "lat", "lng", "name", "openingHours", "phone", "phoneE164", "photos", "placeId", "primaryType", "rating", "reviews", "score", "scoreBreakdown", "searchJobId", "status", "types", "userRatingCount") SELECT "address", "city", "district", "email", "firstSeenAt", "googleMapsUri", "id", "lastContactedAt", "lastSyncedAt", "lat", "lng", "name", "openingHours", "phone", "phoneE164", "photos", "placeId", "primaryType", "rating", "reviews", "score", "scoreBreakdown", "searchJobId", "status", "types", "userRatingCount" FROM "Business";
DROP TABLE "Business";
ALTER TABLE "new_Business" RENAME TO "Business";
CREATE UNIQUE INDEX "Business_placeId_key" ON "Business"("placeId");
CREATE INDEX "Business_city_status_idx" ON "Business"("city", "status");
CREATE INDEX "Business_city_district_idx" ON "Business"("city", "district");
CREATE INDEX "Business_score_idx" ON "Business"("score");
CREATE TABLE "new_SearchJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "query" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "scanned" INTEGER NOT NULL DEFAULT 0,
    "withoutWebsite" INTEGER NOT NULL DEFAULT 0,
    "linkOnly" INTEGER NOT NULL DEFAULT 0,
    "saved" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" REAL NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME
);
INSERT INTO "new_SearchJob" ("city", "district", "error", "estimatedCost", "finishedAt", "id", "query", "saved", "scanned", "startedAt", "status", "withoutWebsite") SELECT "city", "district", "error", "estimatedCost", "finishedAt", "id", "query", "saved", "scanned", "startedAt", "status", "withoutWebsite" FROM "SearchJob";
DROP TABLE "SearchJob";
ALTER TABLE "new_SearchJob" RENAME TO "SearchJob";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
