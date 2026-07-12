import dotenv from "dotenv";
import { prisma } from "../src/db/prisma.js";
import { registerUser } from "../src/services/auth.js";
import { createVehicle } from "../src/services/vehicles.js";
import { createDriver } from "../src/services/drivers.js";
import { createTripDraft, dispatchTrip, completeTrip } from "../src/services/trips.js";
import { createMaintenanceLog } from "../src/services/maintenance.js";
import { createFuelLog, createExpense } from "../src/services/fuel-expenses.js";

dotenv.config();

async function main() {
  await prisma.user.deleteMany();
  await prisma.vehicleDocument.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.fuelLog.deleteMany();
  await prisma.maintenanceLog.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();

  const van = await createVehicle(prisma, {
    registrationNumber: "MH-02-AB-1234",
    nameModel: "Tata Ace Gold",
    type: "VAN",
    maximumLoadCapacity: "750",
    odometer: "12400",
    acquisitionCost: "850000",
    region: "Mumbai Metro",
    status: "AVAILABLE"
  });

  const alex = await createDriver(prisma, {
    name: "Rajesh Kumar",
    licenseNumber: "MH-2019-4567890",
    licenseCategory: "LMV",
    licenseExpiryDate: new Date(Date.now() + 86400000 * 365).toISOString(),
    contactNumber: "+91-9876543210",
    email: "rajesh.driver@transitops.in",
    safetyScore: 94,
    status: "AVAILABLE"
  });

  await registerUser(prisma, { email: "manager@transitops.in", password: "Password123!", role: "FLEET_MANAGER" });
  await registerUser(prisma, { email: "driver@transitops.in", password: "Password123!", role: "DRIVER", driverId: alex.id });
  await registerUser(prisma, { email: "safety@transitops.in", password: "Password123!", role: "SAFETY_OFFICER" });
  await registerUser(prisma, { email: "finance@transitops.in", password: "Password123!", role: "FINANCIAL_ANALYST" });

  const draftTrip = await createTripDraft(prisma, {
    source: "Andheri West Depot, Mumbai",
    destination: "Nhava Sheva Port, Navi Mumbai",
    vehicleId: van.id,
    driverId: alex.id,
    cargoWeight: "450",
    plannedDistance: "42",
    revenue: "8500"
  });

  const dispatched = await dispatchTrip(prisma, draftTrip.id);
  await completeTrip(prisma, {
    tripId: dispatched.id,
    finalOdometer: "12442",
    fuelConsumed: "8"
  });

  await createFuelLog(prisma, { vehicleId: van.id, liters: "40", cost: "3600" });
  await createExpense(prisma, { vehicleId: van.id, type: "Toll", amount: "450" });
  await createMaintenanceLog(prisma, {
    vehicleId: van.id,
    description: "Engine oil change",
    cost: "3200"
  });

  console.log("Seed complete: India demo fleet (Mumbai), Rajesh Kumar, completed trip");
}

main().finally(async () => {
  await prisma.$disconnect();
});
