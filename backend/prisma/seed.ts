import dotenv from "dotenv";
import { inferVehicleTypeFromModel } from "@transitops/shared";
import { prisma } from "../src/db/prisma.js";
import { registerUser } from "../src/services/auth.js";
import { createVehicle } from "../src/services/vehicles.js";
import { createDriver } from "../src/services/drivers.js";
import { createTripDraft, dispatchTrip, completeTrip } from "../src/services/trips.js";
import { createMaintenanceLog } from "../src/services/maintenance.js";
import { createFuelLog, createExpense } from "../src/services/fuel-expenses.js";

dotenv.config();

/** Reconcile stored type with model name (guards seed edits and legacy junk rows). */
async function normalizeVehicleTypes() {
  const vehicles = await prisma.vehicle.findMany({ select: { id: true, nameModel: true, type: true } });
  for (const vehicle of vehicles) {
    const inferred = inferVehicleTypeFromModel(vehicle.nameModel);
    if (inferred && inferred !== vehicle.type) {
      await prisma.vehicle.update({ where: { id: vehicle.id }, data: { type: inferred } });
    }
  }
}

async function main() {
  await prisma.user.deleteMany();
  await prisma.vehicleDocument.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.fuelLog.deleteMany();
  await prisma.maintenanceLog.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();

  const vanMumbai = await createVehicle(prisma, {
    registrationNumber: "MH-02-AB-1234",
    nameModel: "Tata Ace Gold",
    type: "VAN",
    maximumLoadCapacity: "750",
    odometer: "12442",
    acquisitionCost: "850000",
    region: "Mumbai Metro",
    status: "AVAILABLE"
  });

  const truckDelhi = await createVehicle(prisma, {
    registrationNumber: "DL-01-CD-5678",
    nameModel: "Tata LPT 1109",
    type: "TRUCK",
    maximumLoadCapacity: "7500",
    odometer: "48200",
    acquisitionCost: "1850000",
    region: "Delhi NCR",
    status: "AVAILABLE"
  });

  const vanBengaluru = await createVehicle(prisma, {
    registrationNumber: "KA-03-EF-9012",
    nameModel: "Mahindra Bolero Pickup",
    type: "VAN",
    maximumLoadCapacity: "1200",
    odometer: "28600",
    acquisitionCost: "920000",
    region: "Bengaluru",
    status: "AVAILABLE"
  });

  const vanPune = await createVehicle(prisma, {
    registrationNumber: "MH-14-GH-3456",
    nameModel: "Ashok Leyland Dost",
    type: "VAN",
    maximumLoadCapacity: "1250",
    odometer: "19800",
    acquisitionCost: "780000",
    region: "Pune",
    status: "AVAILABLE"
  });

  const rajesh = await createDriver(prisma, {
    name: "Rajesh Kumar",
    licenseNumber: "MH-2019-4567890",
    licenseCategory: "LMV",
    licenseExpiryDate: new Date(Date.now() + 86400000 * 365).toISOString(),
    contactNumber: "+91-9876543210",
    email: "rajesh.driver@transitops.in",
    safetyScore: 94,
    status: "AVAILABLE"
  });

  const ramesh = await createDriver(prisma, {
    name: "Ramesh Kumar",
    licenseNumber: "DL-2020-1122334",
    licenseCategory: "HMV",
    licenseExpiryDate: new Date(Date.now() + 86400000 * 400).toISOString(),
    contactNumber: "+91-9812345678",
    email: "ramesh.driver@transitops.in",
    safetyScore: 91,
    status: "AVAILABLE"
  });

  const priya = await createDriver(prisma, {
    name: "Priya Sharma",
    licenseNumber: "KA-2021-7788990",
    licenseCategory: "LMV",
    licenseExpiryDate: new Date(Date.now() + 86400000 * 300).toISOString(),
    contactNumber: "+91-9988776655",
    email: "priya.driver@transitops.in",
    safetyScore: 96,
    status: "AVAILABLE"
  });

  await registerUser(prisma, { email: "manager@transitops.in", password: "Password123!", role: "FLEET_MANAGER" });
  await registerUser(prisma, { email: "driver@transitops.in", password: "Password123!", role: "DRIVER", driverId: rajesh.id });
  await registerUser(prisma, { email: "safety@transitops.in", password: "Password123!", role: "SAFETY_OFFICER" });
  await registerUser(prisma, { email: "finance@transitops.in", password: "Password123!", role: "FINANCIAL_ANALYST" });

  // COMPLETED historical trip (Mumbai port run)
  const completedDraft = await createTripDraft(prisma, {
    source: "Andheri West Depot, Mumbai",
    destination: "Nhava Sheva Port, Navi Mumbai",
    vehicleId: vanMumbai.id,
    driverId: rajesh.id,
    cargoWeight: "450",
    plannedDistance: "42",
    revenue: "8500"
  });
  const completedDispatched = await dispatchTrip(prisma, completedDraft.id);
  await completeTrip(prisma, {
    tripId: completedDispatched.id,
    finalOdometer: "12442",
    fuelConsumed: "8"
  });

  // DISPATCHED active trip (Delhi NCR) — backdate dispatchedAt ~45 min ago
  const activeDraft = await createTripDraft(prisma, {
    source: "Okhla Industrial Area, New Delhi",
    destination: "Gurugram Logistics Park, Haryana",
    vehicleId: truckDelhi.id,
    driverId: ramesh.id,
    cargoWeight: "5200",
    plannedDistance: "38",
    revenue: "22000"
  });
  const activeDispatched = await dispatchTrip(prisma, activeDraft.id);
  const dispatchedAt = new Date(Date.now() - 45 * 60 * 1000);
  await prisma.trip.update({
    where: { id: activeDispatched.id },
    data: { dispatchedAt }
  });

  // DRAFT trips with distinct routes
  await createTripDraft(prisma, {
    source: "Pune Hub, Pimpri-Chinchwad",
    destination: "Bhiwandi Warehouse, Thane",
    vehicleId: vanPune.id,
    driverId: priya.id,
    cargoWeight: "680",
    plannedDistance: "125",
    revenue: "14500"
  });

  await createTripDraft(prisma, {
    source: "Electronic City, Bengaluru",
    destination: "Whitefield, Bengaluru",
    vehicleId: vanBengaluru.id,
    driverId: priya.id,
    cargoWeight: "520",
    plannedDistance: "28",
    revenue: "6200"
  });

  await createFuelLog(prisma, { vehicleId: vanMumbai.id, liters: "40", cost: "3600" });
  await createExpense(prisma, { vehicleId: vanMumbai.id, type: "Toll", amount: "450" });
  await createMaintenanceLog(prisma, {
    vehicleId: vanMumbai.id,
    description: "Engine oil change",
    cost: "3200"
  });

  // FIX 3: ensure demo fleet types match model names (Tata LPT→TRUCK, Bolero/Ace→VAN)
  await normalizeVehicleTypes();

  console.log(
    "Seed complete: 4 vehicles, 3 drivers, 1 completed + 1 dispatched + 2 draft trips (India demo)"
  );
}

main().finally(async () => {
  await prisma.$disconnect();
});
