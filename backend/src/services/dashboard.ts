import { DriverStatus, PrismaClient, TripStatus, VehicleStatus } from "@prisma/client";
import { decimalToNumber } from "../lib/utils.js";

type Db = PrismaClient;

type DayBucket = { date: Date; label: string };

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

  const vehicleIds = new Set(vehicles.map((vehicle) => vehicle.id));
  const scopedTrips = trips.filter((trip) => vehicleIds.has(trip.vehicleId));
  const scopedMaintenance = maintenanceLogs.filter((log) => vehicleIds.has(log.vehicleId));
  const scopedFuel = fuelLogs.filter((log) => vehicleIds.has(log.vehicleId));
  const scopedExpenses = expenses.filter((expense) => vehicleIds.has(expense.vehicleId));

  const activeVehicles = vehicles.filter((v) => v.status !== VehicleStatus.RETIRED).length;
  const availableVehicles = vehicles.filter((v) => v.status === VehicleStatus.AVAILABLE).length;
  const inShopVehicles = vehicles.filter((v) => v.status === VehicleStatus.IN_SHOP).length;
  const activeTrips = scopedTrips.filter((t) => t.status === TripStatus.DISPATCHED).length;
  const pendingTrips = scopedTrips.filter((t) => t.status === TripStatus.DRAFT).length;
  const driversOnDuty = drivers.filter(
    (d) => d.status === DriverStatus.AVAILABLE || d.status === DriverStatus.ON_TRIP
  ).length;
  const onTripVehicles = vehicles.filter((v) => v.status === VehicleStatus.ON_TRIP).length;
  const fleetUtilization = activeVehicles === 0 ? 0 : (onTripVehicles / activeVehicles) * 100;

  const dayBuckets = buildLast7DayBuckets();
  const completedTrips = scopedTrips.filter((t) => t.status === TripStatus.COMPLETED);
  const utilizationTrend = buildCompletedTripsTrend(dayBuckets, completedTrips);
  const weeklyPerformance = buildWeeklyPerformance(dayBuckets, scopedTrips);
  const kpiSparklines = buildKpiSparklines(dayBuckets, scopedTrips, scopedMaintenance);

  const costBreakdown = [
    { label: "Fuel", value: scopedFuel.reduce((sum, log) => sum + decimalToNumber(log.cost), 0) },
    {
      label: "Maintenance",
      value: scopedMaintenance.reduce((sum, log) => sum + decimalToNumber(log.cost), 0)
    },
    { label: "Other", value: scopedExpenses.reduce((sum, e) => sum + decimalToNumber(e.amount), 0) }
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
    weeklyPerformance,
    kpiSparklines,
    costBreakdown
  };
}

function buildLast7DayBuckets(): DayBucket[] {
  const buckets: DayBucket[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    buckets.push({
      date,
      label: date.toLocaleDateString("en-US", { weekday: "short" })
    });
  }

  return buckets;
}

function sameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function bucketIndex(buckets: DayBucket[], value: Date) {
  return buckets.findIndex((bucket) => sameCalendarDay(value, bucket.date));
}

function emptySeries(length: number) {
  return new Array<number>(length).fill(0);
}

function buildCompletedTripsTrend(
  buckets: DayBucket[],
  trips: Awaited<ReturnType<Db["trip"]["findMany"]>>
) {
  const counts = emptySeries(buckets.length);

  for (const trip of trips) {
    if (trip.status !== TripStatus.COMPLETED) continue;
    const when = trip.completedAt ?? trip.createdAt;
    const index = bucketIndex(buckets, when);
    if (index >= 0) counts[index] = (counts[index] ?? 0) + 1;
  }

  return buckets.map((bucket, index) => ({ label: bucket.label, value: counts[index] ?? 0 }));
}

function buildWeeklyPerformance(
  buckets: DayBucket[],
  trips: Awaited<ReturnType<Db["trip"]["findMany"]>>
) {
  const completed = emptySeries(buckets.length);
  const dispatched = emptySeries(buckets.length);
  const revenue = emptySeries(buckets.length);

  for (const trip of trips) {
    if (trip.dispatchedAt) {
      const dispatchIndex = bucketIndex(buckets, trip.dispatchedAt);
      if (dispatchIndex >= 0) dispatched[dispatchIndex] = (dispatched[dispatchIndex] ?? 0) + 1;
    }

    if (trip.status === TripStatus.COMPLETED) {
      const completedAt = trip.completedAt ?? trip.createdAt;
      const completeIndex = bucketIndex(buckets, completedAt);
      if (completeIndex >= 0) {
        completed[completeIndex] = (completed[completeIndex] ?? 0) + 1;
        revenue[completeIndex] = (revenue[completeIndex] ?? 0) + decimalToNumber(trip.revenue);
      }
    }
  }

  return buckets.map((bucket, index) => ({
    label: bucket.label,
    trips: completed[index] ?? 0,
    dispatched: dispatched[index] ?? 0,
    revenue: Math.round(revenue[index] ?? 0)
  }));
}

function buildKpiSparklines(
  buckets: DayBucket[],
  trips: Awaited<ReturnType<Db["trip"]["findMany"]>>,
  maintenanceLogs: { vehicleId: string; openedAt: Date }[]
) {
  const activeTrips = emptySeries(buckets.length);
  const pendingTrips = emptySeries(buckets.length);
  const activeVehicles = emptySeries(buckets.length);
  const availableVehicles = emptySeries(buckets.length);
  const inShopVehicles = emptySeries(buckets.length);
  const driversOnDuty = emptySeries(buckets.length);

  for (const [index, bucket] of buckets.entries()) {
    const dayTrips = trips.filter((trip) => {
      const when = trip.dispatchedAt ?? trip.createdAt;
      return sameCalendarDay(when, bucket.date);
    });

    activeTrips[index] = dayTrips.filter((trip) => trip.dispatchedAt).length;
    pendingTrips[index] = trips.filter(
      (trip) => trip.status === TripStatus.DRAFT && sameCalendarDay(trip.createdAt, bucket.date)
    ).length;

    const vehiclesUsed = new Set<string>();
    const driversUsed = new Set<string>();
    let completions = 0;

    for (const trip of trips) {
      if (trip.dispatchedAt && sameCalendarDay(trip.dispatchedAt, bucket.date)) {
        vehiclesUsed.add(trip.vehicleId);
        driversUsed.add(trip.driverId);
      }
      if (
        trip.status === TripStatus.COMPLETED &&
        trip.completedAt &&
        sameCalendarDay(trip.completedAt, bucket.date)
      ) {
        completions += 1;
      }
    }

    activeVehicles[index] = vehiclesUsed.size;
    availableVehicles[index] = completions;
    driversOnDuty[index] = driversUsed.size;
    inShopVehicles[index] = maintenanceLogs.filter((log) =>
      sameCalendarDay(log.openedAt, bucket.date)
    ).length;
  }

  return {
    activeVehicles,
    availableVehicles,
    inShopVehicles,
    activeTrips,
    pendingTrips,
    driversOnDuty
  };
}
