-- AlterEnum
ALTER TYPE "AppointmentStatus" ADD VALUE 'in_progress';

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "videoCallDuration" INTEGER,
ADD COLUMN     "videoCallEndedAt" TIMESTAMP(3),
ADD COLUMN     "videoCallIsActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "videoCallStartedAt" TIMESTAMP(3);
