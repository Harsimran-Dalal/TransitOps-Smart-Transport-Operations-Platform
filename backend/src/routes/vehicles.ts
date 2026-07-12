import { Router } from "express";
import { listQuerySchema, vehicleUpsertSchema } from "@transitops/shared";
import { prisma } from "../db/prisma.js";
import { requireAuth, requireSection } from "../middleware/auth.js";
import { paramId } from "../lib/params.js";
import {
  createVehicle,
  deleteVehicle,
  getVehicle,
  listVehicles,
  updateVehicle
} from "../services/vehicles.js";
import { listAssignableDrivers } from "../services/drivers.js";

export const vehiclesRouter = Router();

vehiclesRouter.get("/", requireAuth, requireSection("vehicles", "read"), async (request, response, next) => {
  try {
    const query = listQuerySchema.parse(request.query);
    response.json(await listVehicles(prisma, query));
  } catch (error) {
    next(error);
  }
});

vehiclesRouter.get("/dispatch-options", requireAuth, requireSection("trips", "read"), async (_request, response, next) => {
  try {
    response.json({
      vehicles: (await listVehicles(prisma, { dispatchOnly: true, limit: 100, page: 1 })).items,
      drivers: await listAssignableDrivers(prisma)
    });
  } catch (error) {
    next(error);
  }
});

vehiclesRouter.get("/:id", requireAuth, requireSection("vehicles", "read"), async (request, response, next) => {
  try {
    response.json(await getVehicle(prisma, paramId(request.params.id)));
  } catch (error) {
    next(error);
  }
});

vehiclesRouter.post("/", requireAuth, requireSection("vehicles", "write"), async (request, response, next) => {
  try {
    const body = vehicleUpsertSchema.parse(request.body);
    response.status(201).json(await createVehicle(prisma, body));
  } catch (error) {
    next(error);
  }
});

vehiclesRouter.put("/:id", requireAuth, requireSection("vehicles", "write"), async (request, response, next) => {
  try {
    const body = vehicleUpsertSchema.parse(request.body);
    response.json(await updateVehicle(prisma, paramId(request.params.id), body));
  } catch (error) {
    next(error);
  }
});

vehiclesRouter.delete("/:id", requireAuth, requireSection("vehicles", "write"), async (request, response, next) => {
  try {
    await deleteVehicle(prisma, paramId(request.params.id));
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});
