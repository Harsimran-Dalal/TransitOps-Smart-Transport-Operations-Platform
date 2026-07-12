import { Router } from "express";
import { listQuerySchema, tripCompleteSchema, tripTrackingSchema, tripUpsertSchema } from "@transitops/shared";
import { prisma } from "../db/prisma.js";
import { requireAuth, requireSection } from "../middleware/auth.js";
import { paramId } from "../lib/params.js";
import {
  cancelTrip,
  completeTrip,
  createTripDraft,
  dispatchTrip,
  getTrip,
  listTrips,
  updateTripTracking
} from "../services/trips.js";

export const tripsRouter = Router();

tripsRouter.get("/", requireAuth, requireSection("trips", "read"), async (request, response, next) => {
  try {
    const query = listQuerySchema.parse(request.query);
    response.json(await listTrips(prisma, query));
  } catch (error) {
    next(error);
  }
});

tripsRouter.get("/:id", requireAuth, requireSection("trips", "read"), async (request, response, next) => {
  try {
    response.json(await getTrip(prisma, paramId(request.params.id)));
  } catch (error) {
    next(error);
  }
});

tripsRouter.post("/", requireAuth, requireSection("trips", "write"), async (request, response, next) => {
  try {
    const body = tripUpsertSchema.parse(request.body);
    response.status(201).json(await createTripDraft(prisma, body));
  } catch (error) {
    next(error);
  }
});

tripsRouter.post("/:id/dispatch", requireAuth, requireSection("trips", "write"), async (request, response, next) => {
  try {
    response.json(await dispatchTrip(prisma, paramId(request.params.id)));
  } catch (error) {
    next(error);
  }
});

tripsRouter.patch("/:id/tracking", requireAuth, requireSection("trips", "write"), async (request, response, next) => {
  try {
    const body = tripTrackingSchema.parse(request.body);
    response.json(await updateTripTracking(prisma, paramId(request.params.id), body));
  } catch (error) {
    next(error);
  }
});

tripsRouter.post("/:id/complete", requireAuth, requireSection("trips", "write"), async (request, response, next) => {
  try {
    const body = tripCompleteSchema.parse(request.body);
    response.json(await completeTrip(prisma, { tripId: paramId(request.params.id), ...body }));
  } catch (error) {
    next(error);
  }
});

tripsRouter.post("/:id/cancel", requireAuth, requireSection("trips", "write"), async (request, response, next) => {
  try {
    response.json(await cancelTrip(prisma, paramId(request.params.id)));
  } catch (error) {
    next(error);
  }
});
