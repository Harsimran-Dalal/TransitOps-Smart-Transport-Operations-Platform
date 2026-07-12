import { Router } from "express";

import { prisma } from "../db/prisma.js";

import { requireAuth, requireSection } from "../middleware/auth.js";

import { getFleetMapSummary } from "../services/tracking.js";



export const trackingRouter = Router();



trackingRouter.get("/live", requireAuth, requireSection("dashboard", "read"), async (_request, response, next) => {

  try {

    response.json(await getFleetMapSummary(prisma));

  } catch (error) {

    next(error);

  }

});

