-- CreateEnum
CREATE TYPE "Role" AS ENUM ('FLEET_MANAGER', 'DRIVER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST');
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'RETIRED');
CREATE TYPE "DriverStatus" AS ENUM ('AVAILABLE', 'ON_TRIP', 'OFF_DUTY', 'SUSPENDED');
CREATE TYPE "TripStatus" AS ENUM ('DRAFT', 'DISPATCHED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "VehicleType" AS ENUM ('TRUCK', 'VAN', 'BIKE', 'OTHER');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "driverId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Vehicle" (
  "id" TEXT NOT NULL,
  "registrationNumber" TEXT NOT NULL,
  "nameModel" TEXT NOT NULL,
  "type" "VehicleType" NOT NULL,
  "maximumLoadCapacity" DECIMAL(12,2) NOT NULL,
  "odometer" DECIMAL(12,2) NOT NULL,
  "acquisitionCost" DECIMAL(12,2) NOT NULL,
  "region" TEXT NOT NULL,
  "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Driver" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "licenseNumber" TEXT NOT NULL,
  "licenseCategory" TEXT NOT NULL,
  "licenseExpiryDate" TIMESTAMP(3) NOT NULL,
  "contactNumber" TEXT NOT NULL,
  "safetyScore" DECIMAL(5,2) NOT NULL,
  "status" "DriverStatus" NOT NULL DEFAULT 'AVAILABLE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Trip" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "cargoWeight" DECIMAL(12,2) NOT NULL,
  "plannedDistance" DECIMAL(12,2) NOT NULL,
  "finalOdometer" DECIMAL(12,2),
  "fuelConsumed" DECIMAL(12,2),
  "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MaintenanceLog" (
  "id" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "cost" DECIMAL(12,2) NOT NULL,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "isOpen" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "MaintenanceLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FuelLog" (
  "id" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "liters" DECIMAL(12,2) NOT NULL,
  "cost" DECIMAL(12,2) NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FuelLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Expense" (
  "id" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleDocument" (
  "id" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehicleDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_driverId_key" ON "User"("driverId");
CREATE UNIQUE INDEX "Vehicle_registrationNumber_key" ON "Vehicle"("registrationNumber");
CREATE UNIQUE INDEX "Driver_licenseNumber_key" ON "Driver"("licenseNumber");

ALTER TABLE "User" ADD CONSTRAINT "User_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
