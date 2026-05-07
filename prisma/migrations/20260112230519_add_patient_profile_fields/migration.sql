-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'OTHER');

-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE');

-- CreateEnum
CREATE TYPE "Genotype" AS ENUM ('AA', 'AS', 'AC', 'SS', 'SC', 'CC');

-- AlterTable
ALTER TABLE "PatientProfile" ADD COLUMN     "address" TEXT,
ADD COLUMN     "bloodGroup" "BloodGroup",
ADD COLUMN     "city" TEXT,
ADD COLUMN     "disabilities" TEXT,
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "emergencyContactRelationship" TEXT,
ADD COLUMN     "existingConditions" TEXT,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "genotype" "Genotype",
ADD COLUMN     "knownAllergies" TEXT,
ADD COLUMN     "maritalStatus" "MaritalStatus",
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "stateOfResidence" TEXT;
