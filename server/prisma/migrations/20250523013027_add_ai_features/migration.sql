-- CreateEnum
CREATE TYPE "AIJobType" AS ENUM ('demand_forecast', 'menu_optimization', 'customer_segmentation');

-- CreateEnum
CREATE TYPE "AIJobStatus" AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "AIInsightType" AS ENUM ('demand_forecast', 'menu_optimization', 'customer_segmentation');

-- CreateTable
CREATE TABLE "AIJob" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AIJobType" NOT NULL,
    "status" "AIJobStatus" NOT NULL DEFAULT 'pending',
    "parameters" JSONB,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedCompletion" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIInsight" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "type" "AIInsightType" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIJob_restaurantId_status_idx" ON "AIJob"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "AIJob_userId_idx" ON "AIJob"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AIInsight_jobId_key" ON "AIInsight"("jobId");

-- CreateIndex
CREATE INDEX "AIInsight_restaurantId_type_idx" ON "AIInsight"("restaurantId", "type");

-- CreateIndex
CREATE INDEX "AIInsight_validUntil_idx" ON "AIInsight"("validUntil");

-- AddForeignKey
ALTER TABLE "AIJob" ADD CONSTRAINT "AIJob_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIJob" ADD CONSTRAINT "AIJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInsight" ADD CONSTRAINT "AIInsight_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AIJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInsight" ADD CONSTRAINT "AIInsight_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
