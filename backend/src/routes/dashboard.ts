import { Router } from "express";
import { dashboardQuerySchema } from "@transitops/shared";
import { prisma } from "../db/prisma.js";
import { requireAuth, requireSection } from "../middleware/auth.js";
import { dashboardMetrics } from "../services/dashboard.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", requireAuth, requireSection("dashboard", "read"), async (request, response, next) => {
  try {
    const query = dashboardQuerySchema.parse(request.query);
    response.json(await dashboardMetrics(prisma, query));
  } catch (error) {
    next(error);
  }
});
