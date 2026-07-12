import { Router } from "express";
import { maintenanceCreateSchema } from "@transitops/shared";
import { prisma } from "../db/prisma.js";
import { requireAuth, requireSection } from "../middleware/auth.js";
import { paramId } from "../lib/params.js";
import { closeMaintenanceLog, createMaintenanceLog, listMaintenanceLogs } from "../services/maintenance.js";

export const maintenanceRouter = Router();

maintenanceRouter.get("/", requireAuth, requireSection("maintenance", "read"), async (request, response, next) => {
  try {
    const vehicleId = typeof request.query.vehicleId === "string" ? request.query.vehicleId : undefined;
    const isOpen = request.query.isOpen === "true" ? true : request.query.isOpen === "false" ? false : undefined;
    response.json(await listMaintenanceLogs(prisma, { vehicleId, isOpen }));
  } catch (error) {
    next(error);
  }
});

maintenanceRouter.post("/", requireAuth, requireSection("maintenance", "write"), async (request, response, next) => {
  try {
    const body = maintenanceCreateSchema.parse(request.body);
    response.status(201).json(await createMaintenanceLog(prisma, body));
  } catch (error) {
    next(error);
  }
});

maintenanceRouter.post("/:id/close", requireAuth, requireSection("maintenance", "write"), async (request, response, next) => {
  try {
    response.json(await closeMaintenanceLog(prisma, paramId(request.params.id)));
  } catch (error) {
    next(error);
  }
});
