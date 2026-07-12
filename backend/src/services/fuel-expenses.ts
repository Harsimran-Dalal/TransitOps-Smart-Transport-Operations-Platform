import { PrismaClient } from "@prisma/client";
import { ApiError } from "../lib/errors.js";
import { parsePositiveDecimal, buildPagination, parseSort } from "../lib/utils.js";

type Db = PrismaClient;

export async function createFuelLog(db: Db, input: { vehicleId: string; liters: string; cost: string }) {
  const vehicle = await db.vehicle.findUnique({ where: { id: input.vehicleId } });
  if (!vehicle) throw new ApiError(404, "Vehicle not found");

  return db.fuelLog.create({
    data: {
      vehicleId: input.vehicleId,
      liters: parsePositiveDecimal(input.liters, "Fuel liters"),
      cost: parsePositiveDecimal(input.cost, "Fuel cost")
    }
  });
}

export async function createExpense(db: Db, input: { vehicleId: string; type: string; amount: string }) {
  const vehicle = await db.vehicle.findUnique({ where: { id: input.vehicleId } });
  if (!vehicle) throw new ApiError(404, "Vehicle not found");

  return db.expense.create({
    data: {
      vehicleId: input.vehicleId,
      type: input.type,
      amount: parsePositiveDecimal(input.amount, "Expense amount")
    }
  });
}

export async function listFuelLogs(db: Db, filters: { vehicleId?: string; page?: number; limit?: number }) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const where = filters.vehicleId ? { vehicleId: filters.vehicleId } : {};

  const [items, total] = await Promise.all([
    db.fuelLog.findMany({
      where,
      include: { vehicle: true },
      orderBy: parseSort(undefined, ["recordedAt"]),
      skip: (page - 1) * limit,
      take: limit
    }),
    db.fuelLog.count({ where })
  ]);

  return { items, pagination: buildPagination(page, limit, total) };
}

export async function listExpenses(db: Db, filters: { vehicleId?: string; page?: number; limit?: number }) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const where = filters.vehicleId ? { vehicleId: filters.vehicleId } : {};

  const [items, total] = await Promise.all([
    db.expense.findMany({
      where,
      include: { vehicle: true },
      orderBy: parseSort(undefined, ["recordedAt"]),
      skip: (page - 1) * limit,
      take: limit
    }),
    db.expense.count({ where })
  ]);

  return { items, pagination: buildPagination(page, limit, total) };
}
