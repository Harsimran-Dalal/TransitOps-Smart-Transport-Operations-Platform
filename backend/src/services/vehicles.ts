import { Prisma, PrismaClient, VehicleStatus } from "@prisma/client";
import { ApiError } from "../lib/errors.js";
import { buildPagination, parsePositiveDecimal, parseSort } from "../lib/utils.js";

type Db = PrismaClient | Prisma.TransactionClient;

export type VehicleInput = {
  registrationNumber: string;
  nameModel: string;
  type: "TRUCK" | "VAN" | "BIKE" | "OTHER";
  maximumLoadCapacity: string;
  odometer: string;
  acquisitionCost: string;
  region: string;
  status: VehicleStatus;
};

export async function createVehicle(db: Db, input: VehicleInput) {
  return db.vehicle.create({
    data: {
      registrationNumber: input.registrationNumber,
      nameModel: input.nameModel,
      type: input.type,
      maximumLoadCapacity: parsePositiveDecimal(input.maximumLoadCapacity, "Maximum load capacity"),
      odometer: parsePositiveDecimal(input.odometer, "Odometer"),
      acquisitionCost: parsePositiveDecimal(input.acquisitionCost, "Acquisition cost"),
      region: input.region,
      status: input.status
    }
  });
}

export async function updateVehicle(db: Db, id: string, input: VehicleInput) {
  const existing = await db.vehicle.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Vehicle not found");

  return db.vehicle.update({
    where: { id },
    data: {
      registrationNumber: input.registrationNumber,
      nameModel: input.nameModel,
      type: input.type,
      maximumLoadCapacity: parsePositiveDecimal(input.maximumLoadCapacity, "Maximum load capacity"),
      odometer: parsePositiveDecimal(input.odometer, "Odometer"),
      acquisitionCost: parsePositiveDecimal(input.acquisitionCost, "Acquisition cost"),
      region: input.region,
      status: input.status
    }
  });
}

export async function deleteVehicle(db: Db, id: string) {
  const existing = await db.vehicle.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Vehicle not found");
  await db.vehicle.delete({ where: { id } });
}

export async function listVehicles(
  db: Db,
  filters: { q?: string; type?: string; status?: string; region?: string; dispatchOnly?: boolean; page?: number; limit?: number; sort?: string }
) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const where: Prisma.VehicleWhereInput = {
    ...(filters.type ? { type: filters.type as never } : {}),
    ...(filters.status ? { status: filters.status as never } : {}),
    ...(filters.region ? { region: filters.region } : {}),
    ...(filters.dispatchOnly ? { status: VehicleStatus.AVAILABLE } : {}),
    ...(filters.q
      ? {
          OR: [
            { registrationNumber: { contains: filters.q, mode: "insensitive" } },
            { nameModel: { contains: filters.q, mode: "insensitive" } },
            { region: { contains: filters.q, mode: "insensitive" } }
          ]
        }
      : {})
  };

  const [items, total] = await Promise.all([
    db.vehicle.findMany({
      where,
      orderBy: parseSort(filters.sort, ["createdAt", "registrationNumber", "status", "region"]),
      skip: (page - 1) * limit,
      take: limit
    }),
    db.vehicle.count({ where })
  ]);

  return { items, pagination: buildPagination(page, limit, total) };
}

export async function getVehicle(db: Db, id: string) {
  const vehicle = await db.vehicle.findUnique({
    where: { id },
    include: { documents: { orderBy: { uploadedAt: "desc" } } }
  });
  if (!vehicle) throw new ApiError(404, "Vehicle not found");
  return vehicle;
}
