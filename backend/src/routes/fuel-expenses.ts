import { Router } from "express";
import { expenseCreateSchema, fuelLogCreateSchema } from "@transitops/shared";
import { prisma } from "../db/prisma.js";
import { requireAuth, requireSection } from "../middleware/auth.js";
import { createExpense, createFuelLog, listExpenses, listFuelLogs } from "../services/fuel-expenses.js";

export const fuelRouter = Router();
export const expensesRouter = Router();

fuelRouter.get("/", requireAuth, requireSection("fuel", "read"), async (request, response, next) => {
  try {
    const vehicleId = typeof request.query.vehicleId === "string" ? request.query.vehicleId : undefined;
    response.json(await listFuelLogs(prisma, { vehicleId }));
  } catch (error) {
    next(error);
  }
});

fuelRouter.post("/", requireAuth, requireSection("fuel", "write"), async (request, response, next) => {
  try {
    const body = fuelLogCreateSchema.parse(request.body);
    response.status(201).json(await createFuelLog(prisma, body));
  } catch (error) {
    next(error);
  }
});

expensesRouter.get("/", requireAuth, requireSection("fuel", "read"), async (request, response, next) => {
  try {
    const vehicleId = typeof request.query.vehicleId === "string" ? request.query.vehicleId : undefined;
    response.json(await listExpenses(prisma, { vehicleId }));
  } catch (error) {
    next(error);
  }
});

expensesRouter.post("/", requireAuth, requireSection("fuel", "write"), async (request, response, next) => {
  try {
    const body = expenseCreateSchema.parse(request.body);
    response.status(201).json(await createExpense(prisma, body));
  } catch (error) {
    next(error);
  }
});
