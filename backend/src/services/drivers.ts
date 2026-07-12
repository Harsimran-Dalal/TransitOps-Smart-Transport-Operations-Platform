import { DriverStatus, Prisma, PrismaClient } from "@prisma/client";
import { ApiError } from "../lib/errors.js";
import { buildPagination, parsePositiveDecimal, parseSort } from "../lib/utils.js";

type Db = PrismaClient | Prisma.TransactionClient;

export type DriverInput = {
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiryDate: string;
  contactNumber: string;
  email?: string;
  safetyScore: number;
  status: DriverStatus;
};

function parseLicenseDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "Invalid license expiry date");
  }
  return date;
}

export function ensureFutureLicense(licenseExpiryDate: Date) {
  if (licenseExpiryDate.getTime() < Date.now()) {
    throw new ApiError(400, "Driver license is expired");
  }
}

export async function createDriver(db: Db, input: DriverInput) {
  const licenseExpiryDate = parseLicenseDate(input.licenseExpiryDate);
  return db.driver.create({
    data: {
      name: input.name,
      licenseNumber: input.licenseNumber,
      licenseCategory: input.licenseCategory,
      licenseExpiryDate,
      contactNumber: input.contactNumber,
      email: input.email?.trim() ? input.email.trim().toLowerCase() : null,
      safetyScore: parsePositiveDecimal(String(input.safetyScore), "Safety score"),
      status: input.status
    }
  });
}

export async function updateDriver(db: Db, id: string, input: DriverInput) {
  const existing = await db.driver.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Driver not found");

  const licenseExpiryDate = parseLicenseDate(input.licenseExpiryDate);
  return db.driver.update({
    where: { id },
    data: {
      name: input.name,
      licenseNumber: input.licenseNumber,
      licenseCategory: input.licenseCategory,
      licenseExpiryDate,
      contactNumber: input.contactNumber,
      email: input.email?.trim() ? input.email.trim().toLowerCase() : null,
      safetyScore: parsePositiveDecimal(String(input.safetyScore), "Safety score"),
      status: input.status
    }
  });
}

export async function deleteDriver(db: Db, id: string) {
  const existing = await db.driver.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Driver not found");
  await db.driver.delete({ where: { id } });
}

export async function suspendDriver(db: Db, id: string) {
  const driver = await db.driver.findUnique({ where: { id } });
  if (!driver) throw new ApiError(404, "Driver not found");
  if (driver.status === DriverStatus.ON_TRIP) {
    throw new ApiError(400, "Cannot suspend a driver who is on trip");
  }
  return db.driver.update({ where: { id }, data: { status: DriverStatus.SUSPENDED } });
}

export async function unsuspendDriver(db: Db, id: string) {
  const driver = await db.driver.findUnique({ where: { id } });
  if (!driver) throw new ApiError(404, "Driver not found");
  if (driver.status !== DriverStatus.SUSPENDED) {
    throw new ApiError(400, "Driver is not suspended");
  }
  return db.driver.update({ where: { id }, data: { status: DriverStatus.AVAILABLE } });
}

export async function listDrivers(
  db: Db,
  filters: { q?: string; status?: string; page?: number; limit?: number; sort?: string }
) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const where: Prisma.DriverWhereInput = {
    ...(filters.status ? { status: filters.status as never } : {}),
    ...(filters.q
      ? {
          OR: [
            { name: { contains: filters.q, mode: "insensitive" } },
            { licenseNumber: { contains: filters.q, mode: "insensitive" } }
          ]
        }
      : {})
  };

  const [items, total] = await Promise.all([
    db.driver.findMany({
      where,
      orderBy: parseSort(filters.sort, ["createdAt", "name", "status", "safetyScore"]),
      skip: (page - 1) * limit,
      take: limit
    }),
    db.driver.count({ where })
  ]);

  return { items, pagination: buildPagination(page, limit, total) };
}

export async function getDriver(db: Db, id: string) {
  const driver = await db.driver.findUnique({ where: { id } });
  if (!driver) throw new ApiError(404, "Driver not found");
  return driver;
}

export async function listAssignableDrivers(db: Db) {
  return db.driver.findMany({
    where: {
      status: DriverStatus.AVAILABLE,
      licenseExpiryDate: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function listExpiringDrivers(db: Db, withinDays: number) {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + withinDays);
  return db.driver.findMany({
    where: {
      licenseExpiryDate: { lte: deadline, gte: new Date() }
    },
    orderBy: { licenseExpiryDate: "asc" }
  });
}
