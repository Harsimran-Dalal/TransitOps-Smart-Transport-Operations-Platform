import { Router } from "express";
import { Role } from "@prisma/client";
import { driverUpsertSchema, listQuerySchema } from "@transitops/shared";
import { prisma } from "../db/prisma.js";
import { requireAuth, requireRole, requireSection } from "../middleware/auth.js";
import { paramId } from "../lib/params.js";
import {
  createDriver,
  deleteDriver,
  getDriver,
  listDrivers,
  suspendDriver,
  unsuspendDriver,
  updateDriver
} from "../services/drivers.js";

export const driversRouter = Router();

driversRouter.get("/", requireAuth, requireSection("drivers", "read"), async (request, response, next) => {
  try {
    const query = listQuerySchema.parse(request.query);
    response.json(await listDrivers(prisma, query));
  } catch (error) {
    next(error);
  }
});

driversRouter.get("/:id", requireAuth, requireSection("drivers", "read"), async (request, response, next) => {
  try {
    response.json(await getDriver(prisma, paramId(request.params.id)));
  } catch (error) {
    next(error);
  }
});

driversRouter.post("/", requireAuth, requireRole(Role.FLEET_MANAGER), async (request, response, next) => {
  try {
    const body = driverUpsertSchema.parse(request.body);
    response.status(201).json(await createDriver(prisma, body));
  } catch (error) {
    next(error);
  }
});

driversRouter.put("/:id", requireAuth, requireSection("drivers", "write"), async (request, response, next) => {
  try {
    const body = driverUpsertSchema.parse(request.body);
    response.json(await updateDriver(prisma, paramId(request.params.id), body));
  } catch (error) {
    next(error);
  }
});

driversRouter.delete("/:id", requireAuth, requireRole(Role.FLEET_MANAGER), async (request, response, next) => {
  try {
    await deleteDriver(prisma, paramId(request.params.id));
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

driversRouter.post("/:id/suspend", requireAuth, requireSection("drivers", "write"), async (request, response, next) => {
  try {
    response.json(await suspendDriver(prisma, paramId(request.params.id)));
  } catch (error) {
    next(error);
  }
});

driversRouter.post("/:id/unsuspend", requireAuth, requireSection("drivers", "write"), async (request, response, next) => {
  try {
    response.json(await unsuspendDriver(prisma, paramId(request.params.id)));
  } catch (error) {
    next(error);
  }
});
