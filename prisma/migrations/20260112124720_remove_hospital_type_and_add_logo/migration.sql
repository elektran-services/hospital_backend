/*
  Warnings:

  - You are about to drop the column `type` on the `Hospital` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Hospital" DROP COLUMN "type";

-- DropEnum
DROP TYPE "HospitalType";
