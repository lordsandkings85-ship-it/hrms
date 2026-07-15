/*
  Warnings:

  - A unique constraint covering the columns `[companyId,provider]` on the table `Integration` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "condition" TEXT DEFAULT 'good',
ADD COLUMN     "name" TEXT,
ADD COLUMN     "purchaseDate" TIMESTAMP(3),
ADD COLUMN     "purchasePrice" DOUBLE PRECISION,
ADD COLUMN     "serialNumber" TEXT,
ADD COLUMN     "warrantyUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AssetAssignment" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "AttendanceLog" ADD COLUMN     "isWithinGeofence" BOOLEAN,
ADD COLUMN     "regularizationNote" TEXT,
ADD COLUMN     "regularizationStatus" TEXT;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "geofenceLat" DOUBLE PRECISION,
ADD COLUMN     "geofenceLng" DOUBLE PRECISION,
ADD COLUMN     "geofenceRadius" DOUBLE PRECISION DEFAULT 500;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "workingDaysPerWeek" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "ShiftAssignment" ADD COLUMN     "rosterWeek" TEXT,
ADD COLUMN     "weekDay" INTEGER;

-- CreateTable
CREATE TABLE "ExitChecklist" (
    "id" TEXT NOT NULL,
    "exitRequestId" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,

    CONSTRAINT "ExitChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExitRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "resignationDate" TIMESTAMP(3) NOT NULL,
    "lastWorkingDay" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "exitInterviewNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'initiated',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExitRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FnfSettlement" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "lastWorkingDay" TIMESTAMP(3) NOT NULL,
    "noticePeriodDays" INTEGER NOT NULL DEFAULT 0,
    "noticeRecovery" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unpaidSalaryDays" INTEGER NOT NULL DEFAULT 0,
    "unpaidSalaryAmt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gratuityAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leaveEncashDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leaveEncashAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netSettlement" DOUBLE PRECISION NOT NULL,
    "isGratuityEligible" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FnfSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExitRequest_employeeId_key" ON "ExitRequest"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "FnfSettlement_employeeId_key" ON "FnfSettlement"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_companyId_provider_key" ON "Integration"("companyId", "provider");

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExitChecklist" ADD CONSTRAINT "ExitChecklist_exitRequestId_fkey" FOREIGN KEY ("exitRequestId") REFERENCES "ExitRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExitRequest" ADD CONSTRAINT "ExitRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExitRequest" ADD CONSTRAINT "ExitRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FnfSettlement" ADD CONSTRAINT "FnfSettlement_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelRequest" ADD CONSTRAINT "TravelRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
