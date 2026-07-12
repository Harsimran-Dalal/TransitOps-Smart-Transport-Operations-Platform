import { DriverStatus, Prisma, PrismaClient, TripStatus, VehicleStatus } from "@prisma/client";
import { ApiError } from "../lib/errors.js";
import { decimalToNumber, parsePositiveDecimal, buildPagination, parseSort } from "../lib/utils.js";
import { ensureFutureLicense } from "./drivers.js";

type Db = PrismaClient;
export type TripInput = {
  source: string;
  destination: string;
  vehicleId: string;
  driverId: string;
  cargoWeight: string;
  plannedDistance: string;
  revenue?: string;
};

export async function createTripDraft(db: Db, input: TripInput) {
  const vehicle = await db.vehicle.findUnique({ where: { id: input.vehicleId } });
  const driver = await db.driver.findUnique({ where: { id: input.driverId } });
  if (!vehicle) throw new ApiError(404, "Vehicle not found");
  if (!driver) throw new ApiError(404, "Driver not found");

  return db.trip.create({
    data: {
      source: input.source,
      destination: input.destination,
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      cargoWeight: parsePositiveDecimal(input.cargoWeight, "Cargo weight"),
      plannedDistance: parsePositiveDecimal(input.plannedDistance, "Planned distance"),
      revenue: parsePositiveDecimal(input.revenue ?? "0", "Revenue"),
      status: TripStatus.DRAFT
    },
    include: { vehicle: true, driver: true }
  });
}

export async function dispatchTrip(db: Db, tripId: string) {
  return db.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({ where: { id: tripId }, include: { vehicle: true, driver: true } });
    if (!trip) throw new ApiError(404, "Trip not found");
    if (trip.status !== TripStatus.DRAFT) throw new ApiError(400, "Only draft trips can be dispatched");

    const vehicle = trip.vehicle;
    const driver = trip.driver;

    if (vehicle.status !== VehicleStatus.AVAILABLE) {
      throw new ApiError(400, "Vehicle is not available for dispatch");
    }
    if (driver.status !== DriverStatus.AVAILABLE) {
      throw new ApiError(400, "Driver is not available for dispatch");
    }
    ensureFutureLicense(driver.licenseExpiryDate);
    if (decimalToNumber(trip.cargoWeight) > decimalToNumber(vehicle.maximumLoadCapacity)) {
      throw new ApiError(400, "Cargo weight exceeds vehicle load capacity");
    }

    const [vehicleUpdate, driverUpdate] = await Promise.all([
      tx.vehicle.updateMany({ where: { id: vehicle.id, status: VehicleStatus.AVAILABLE }, data: { status: VehicleStatus.ON_TRIP } }),
      tx.driver.updateMany({ where: { id: driver.id, status: DriverStatus.AVAILABLE }, data: { status: DriverStatus.ON_TRIP } })
    ]);

    if (vehicleUpdate.count !== 1 || driverUpdate.count !== 1) {
      throw new ApiError(409, "Vehicle or driver was assigned by another request");
    }

    return tx.trip.update({
      where: { id: trip.id },
      data: { status: TripStatus.DISPATCHED, dispatchedAt: new Date() },
      include: { vehicle: true, driver: true }
    });
  });
}

export async function completeTrip(db: Db, input: { tripId: string; finalOdometer: string; fuelConsumed: string }) {
  const finalOdometer = parsePositiveDecimal(input.finalOdometer, "Final odometer");
  const fuelConsumed = parsePositiveDecimal(input.fuelConsumed, "Fuel consumed");

  return db.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({ where: { id: input.tripId }, include: { vehicle: true, driver: true } });
    if (!trip) throw new ApiError(404, "Trip not found");
    if (trip.status !== TripStatus.DISPATCHED) throw new ApiError(400, "Only dispatched trips can be completed");
    if (decimalToNumber(finalOdometer) < decimalToNumber(trip.vehicle.odometer)) {
      throw new ApiError(400, "Final odometer cannot be less than current vehicle odometer");
    }

    await tx.trip.update({
      where: { id: trip.id },
      data: { status: TripStatus.COMPLETED, finalOdometer, fuelConsumed, completedAt: new Date() }
    });
    await tx.vehicle.update({
      where: { id: trip.vehicleId },
      data: { status: VehicleStatus.AVAILABLE, odometer: finalOdometer }
    });
    await tx.driver.update({ where: { id: trip.driverId }, data: { status: DriverStatus.AVAILABLE } });

    return tx.trip.findUnique({
      where: { id: trip.id },
      include: { vehicle: true, driver: true }
    });
  });
}

export async function cancelTrip(db: Db, tripId: string) {
  return db.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({ where: { id: tripId }, include: { vehicle: true, driver: true } });
    if (!trip) throw new ApiError(404, "Trip not found");

    if (trip.status === TripStatus.DISPATCHED) {
      await tx.vehicle.update({ where: { id: trip.vehicleId }, data: { status: VehicleStatus.AVAILABLE } });
      await tx.driver.update({ where: { id: trip.driverId }, data: { status: DriverStatus.AVAILABLE } });
    } else if (trip.status !== TripStatus.DRAFT) {
      throw new ApiError(400, "Only draft or dispatched trips can be cancelled");
    }

    return tx.trip.update({
      where: { id: trip.id },
      data: { status: TripStatus.CANCELLED },
      include: { vehicle: true, driver: true }
    });
  });
}

export async function listTrips(
  db: Db,
  filters: { q?: string; status?: string; page?: number; limit?: number; sort?: string }
) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const where: Prisma.TripWhereInput = {
    ...(filters.status ? { status: filters.status as never } : {}),
    ...(filters.q
      ? {
          OR: [
            { source: { contains: filters.q, mode: "insensitive" } },
            { destination: { contains: filters.q, mode: "insensitive" } },
            { vehicle: { registrationNumber: { contains: filters.q, mode: "insensitive" } } },
            { vehicle: { nameModel: { contains: filters.q, mode: "insensitive" } } },
            { driver: { name: { contains: filters.q, mode: "insensitive" } } }
          ]
        }
      : {})
  };

  const [items, total] = await Promise.all([
    db.trip.findMany({
      where,
      include: { vehicle: true, driver: true },
      orderBy: parseSort(filters.sort, ["createdAt", "status"]),
      skip: (page - 1) * limit,
      take: limit
    }),
    db.trip.count({ where })
  ]);

  return { items, pagination: buildPagination(page, limit, total) };
}

export async function getTrip(db: Db, id: string) {
  const trip = await db.trip.findUnique({ where: { id }, include: { vehicle: true, driver: true } });
  if (!trip) throw new ApiError(404, "Trip not found");
  return trip;
}

export async function updateTripTracking(
  db: Db,
  tripId: string,
  input: { source: string; destination: string; liveLocationUrl?: string }
) {
  const trip = await db.trip.findUnique({ where: { id: tripId } });
  if (!trip) throw new ApiError(404, "Trip not found");
  if (trip.status !== TripStatus.DISPATCHED && trip.status !== TripStatus.DRAFT) {
    throw new ApiError(400, "Only draft or dispatched trips can update map tracking");
  }

  const live = input.liveLocationUrl?.trim();
  if (live) {
    try {
      // eslint-disable-next-line no-new
      new URL(live);
    } catch {
      throw new ApiError(400, "Live location must be a valid URL");
    }
    if (!/google\.[^/]*\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\./i.test(live)) {
      throw new ApiError(400, "Paste a Google Maps share link (maps.google.com or maps.app.goo.gl)");
    }
  }

  return db.trip.update({
    where: { id: tripId },
    data: {
      source: input.source.trim(),
      destination: input.destination.trim(),
      liveLocationUrl: live || null
    },
    include: { vehicle: true, driver: true }
  });
}
