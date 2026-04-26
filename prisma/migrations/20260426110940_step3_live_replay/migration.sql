-- CreateEnum
CREATE TYPE "ReplayStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "VideoSourceType" AS ENUM ('external', 'cos', 'vod');

-- CreateTable
CREATE TABLE "LiveReplay" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "videoUrl" TEXT NOT NULL,
    "videoSource" "VideoSourceType" NOT NULL DEFAULT 'external',
    "durationSeconds" INTEGER NOT NULL,
    "liveAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "status" "ReplayStatus" NOT NULL DEFAULT 'draft',
    "metadata" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveReplay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserReplayProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "replayId" TEXT NOT NULL,
    "positionSeconds" INTEGER NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "firstViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "UserReplayProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiveReplay_hostId_status_publishedAt_idx" ON "LiveReplay"("hostId", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "LiveReplay_status_publishedAt_idx" ON "LiveReplay"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "UserReplayProgress_userId_lastViewedAt_idx" ON "UserReplayProgress"("userId", "lastViewedAt");

-- CreateIndex
CREATE INDEX "UserReplayProgress_replayId_idx" ON "UserReplayProgress"("replayId");

-- CreateIndex
CREATE UNIQUE INDEX "UserReplayProgress_userId_replayId_key" ON "UserReplayProgress"("userId", "replayId");

-- AddForeignKey
ALTER TABLE "LiveReplay" ADD CONSTRAINT "LiveReplay_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReplayProgress" ADD CONSTRAINT "UserReplayProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReplayProgress" ADD CONSTRAINT "UserReplayProgress_replayId_fkey" FOREIGN KEY ("replayId") REFERENCES "LiveReplay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

