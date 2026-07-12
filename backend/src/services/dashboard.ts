import { DriverStatus, PrismaClient, TripStatus, VehicleStatus } from "@prisma/client";
import { decimalToNumber } from "../lib/utils.js";

type Db = PrismaClient;

export async function dashboardMetrics(
  db: Db,
  filters: { type?: string; status?: string; region?: string }
) {
  const vehicleWhere = {
    ...(filters.type ? { type: filters.type as never } : {}),
    ...(filters.status ? { status: filters.status as never } : {}),
    ...(filters.region ? { region: filters.region } : {})
  };

  const [vehicles, trips, drivers, maintenanceLogs, fuelLogs, expenses] = await Promise.all([
    db.vehicle.findMany({ where: vehicleWhere }),
    db.trip.findMany(),
    db.driver.findMany(),
    db.maintenanceLog.findMany(),
    db.fuelLog.findMany(),
    db.expense.findMany()
  ]);

  const activeVehicles = vehicles.filter((v) => v.status !== VehicleStatus.RETIRED).length;
  const availableVehicles = vehicles.filter((v) => v.status === VehicleStatus.AVAILABLE).length;
  const inShopVehicles = vehicles.filter((v) => v.status === VehicleStatus.IN_SHOP).length;
  const activeTrips = trips.filter((t) => t.status === TripStatus.DISPATCHED).length;
  const pendingTrips = trips.filter((t) => t.status === TripStatus.DRAFT).length;
  const driversOnDuty = drivers.filter(
    (d) => d.status === DriverStatus.AVAILABLE || d.status === DriverStatus.ON_TRIP
  ).length;
  const onTripVehicles = vehicles.filter((v) => v.status === VehicleStatus.ON_TRIP).length;
  const fleetUtilization = activeVehicles === 0 ? 0 : (onTripVehicles / activeVehicles) * 100;

  const completedTrips = trips.filter((t) => t.status === TripStatus.COMPLETED);
  const utilizationTrend = buildWeeklyTrend(completedTrips);
  const costBreakdown = [
    { label: "Fuel", value: fuelLogs.reduce((sum, log) => sum + decimalToNumber(log.cost), 0) },
    { label: "Maintenance", value: maintenanceLogs.reduce((sum, log) => sum + decimalToNumber(log.cost), 0) },
    { label: "Other", value: expenses.reduce((sum, e) => sum + decimalToNumber(e.amount), 0) }
  ];

  return {
    activeVehicles,
    availableVehicles,
    inShopVehicles,
    activeTrips,
    pendingTrips,
    driversOnDuty,
    fleetUtilization,
    utilizationTrend,
    costBreakdown
  };
}

function buildWeeklyTrend(completedTrips: { createdAt: Date }[]) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const counts = new Array(7).fill(0) as number[];
  for (const trip of completedTrips) {
    const day = trip.createdAt.getDay();
    const current = counts[day] ?? 0;
    counts[day] = current + 1;
  }
  return days.map((label, index) => ({ label, value: counts[index] }));
}
