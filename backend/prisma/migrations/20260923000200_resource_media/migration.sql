CREATE TABLE "resource_media" (
  "id" TEXT PRIMARY KEY,
  "resourceId" TEXT NOT NULL REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('IMAGE', 'VIDEO')),
  "url" TEXT NOT NULL,
  "objectKey" TEXT UNIQUE,
  "title" TEXT NOT NULL,
  "altText" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "credit" TEXT,
  "license" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "resource_media_resourceId_sortOrder_idx" ON "resource_media"("resourceId", "sortOrder");
