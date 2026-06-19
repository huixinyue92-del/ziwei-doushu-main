CREATE TABLE "Entitlement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "chartHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'FULL_CHART_UNLOCKED',
  "source" TEXT NOT NULL DEFAULT 'MOCK_PAYMENT',
  "paymentReference" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "Entitlement_chartHash_key" ON "Entitlement"("chartHash");

CREATE TABLE "CheckoutSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "chartHash" TEXT NOT NULL,
  "amount" INTEGER NOT NULL DEFAULT 500,
  "currency" TEXT NOT NULL DEFAULT 'CNY',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" DATETIME
);

CREATE INDEX "CheckoutSession_chartHash_idx" ON "CheckoutSession"("chartHash");

CREATE TABLE "PalaceAnalysis" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "chartHash" TEXT NOT NULL,
  "palaceName" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "PalaceAnalysis_chartHash_palaceName_key" ON "PalaceAnalysis"("chartHash", "palaceName");
