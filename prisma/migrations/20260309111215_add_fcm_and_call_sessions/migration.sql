-- CreateEnum
CREATE TYPE "CallSessionStatus" AS ENUM ('CONNECTING', 'ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fcmToken" TEXT NOT NULL,
    "deviceType" TEXT DEFAULT 'unknown',
    "lastUsedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallSession" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "callerId" TEXT NOT NULL,
    "callerName" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "agoraCallerToken" TEXT NOT NULL,
    "agoraReceiverToken" TEXT NOT NULL,
    "sessionStatus" "CallSessionStatus" NOT NULL DEFAULT 'CONNECTING',
    "notificationSentAt" TIMESTAMP(3),
    "callStartedAt" TIMESTAMP(3),
    "callEndedAt" TIMESTAMP(3),
    "callDuration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeviceToken_userId_idx" ON "DeviceToken"("userId");

-- CreateIndex
CREATE INDEX "DeviceToken_fcmToken_idx" ON "DeviceToken"("fcmToken");

-- CreateIndex
CREATE UNIQUE INDEX "CallSession_appointmentId_key" ON "CallSession"("appointmentId");

-- CreateIndex
CREATE INDEX "CallSession_appointmentId_idx" ON "CallSession"("appointmentId");

-- CreateIndex
CREATE INDEX "CallSession_hospitalId_idx" ON "CallSession"("hospitalId");

-- CreateIndex
CREATE INDEX "CallSession_channelId_idx" ON "CallSession"("channelId");

-- CreateIndex
CREATE INDEX "CallSession_callerId_idx" ON "CallSession"("callerId");

-- CreateIndex
CREATE INDEX "CallSession_receiverId_idx" ON "CallSession"("receiverId");

-- AddForeignKey
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
