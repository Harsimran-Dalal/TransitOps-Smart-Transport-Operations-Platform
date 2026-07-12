import { PrismaClient, VehicleStatus } from "@prisma/client";
import { ApiError } from "../lib/errors.js";
import { parsePositiveDecimal, buildPagination, parseSort } from "../lib/utils.js";

type Db = PrismaClient;

export async function createMaintenanceLog(db: Db, input: { vehicleId: string; description: string; cost: string }) {
  const cost = parsePositiveDecimal(input.cost, "Maintenance cost");

  return db.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.findUnique({ where: { id: input.vehicleId } });
    if (!vehicle) throw new ApiError(404, "Vehicle not found");
    if (vehicle.status === VehicleStatus.ON_TRIP) {
      throw new ApiError(400, "Cannot open maintenance for a vehicle on trip");
    }
    if (vehicle.status === VehicleStatus.RETIRED) {
      throw new ApiError(400, "Cannot open maintenance for a retired vehicle");
    }

    const maintenance = await tx.maintenanceLog.create({
      data: {
        vehicleId: vehicle.id,
        description: input.description,
        cost,
        isOpen: true
      },
      include: { vehicle: true }
    });

    await tx.vehicle.update({ where: { id: vehicle.id }, data: { status: VehicleStatus.IN_SHOP } });
    return maintenance;
  });
}

export async function closeMaintenanceLog(db: Db, logId: string) {
  return db.$transaction(async (tx) => {
    const log = await tx.maintenanceLog.findUnique({ where: { id: logId }, include: { vehicle: true } });
    if (!log) throw new ApiError(404, "Maintenance log not found");
    if (!log.isOpen) throw new ApiError(400, "Maintenance log is already closed");

    await tx.maintenanceLog.update({ where: { id: log.id }, data: { isOpen: false, closedAt: new Date() } });

    const otherOpen = await tx.maintenanceLog.count({
      where: { vehicleId: log.vehicleId, isOpen: true, id: { not: log.id } }
    });

    if (otherOpen === 0) {
      const nextStatus = log.vehicle.status === VehicleStatus.RETIRED ? VehicleStatus.RETIRED : VehicleStatus.AVAILABLE;
      await tx.vehicle.update({ where: { id: log.vehicleId }, data: { status: nextStatus } });
    }

    return tx.maintenanceLog.findUnique({ where: { id: log.id }, include: { vehicle: true } });
  });
}

export async function listMaintenanceLogs(
  db: Db,
  filters: { vehicleId?: string; isOpen?: boolean; page?: number; limit?: number; sort?: string }
) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const where = {
    ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
    ...(filters.isOpen !== undefined ? { isOpen: filters.isOpen } : {})
  };

  const [items, total] = await Promise.all([
    db.maintenanceLog.findMany({
      where,
      include: { vehicle: true },
      orderBy: parseSort(filters.sort, ["openedAt", "cost"]),
      skip: (page - 1) * limit,
      take: limit
    }),
    db.maintenanceLog.count({ where })
  ]);

  return { items, pagination: buildPagination(page, limit, total) };
}
