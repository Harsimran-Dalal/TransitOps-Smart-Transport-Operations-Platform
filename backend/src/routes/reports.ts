import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth, requireSection } from "../middleware/auth.js";
import { reportsCsv, reportsForFleet, reportsPdf } from "../services/reports.js";

export const reportsRouter = Router();

reportsRouter.get("/", requireAuth, requireSection("reports", "read"), async (_request, response, next) => {
  try {
    response.json(await reportsForFleet(prisma));
  } catch (error) {
    next(error);
  }
});

reportsRouter.get("/export.csv", requireAuth, requireSection("reports", "read"), async (_request, response, next) => {
  try {
    response.type("text/csv").send(await reportsCsv(prisma));
  } catch (error) {
    next(error);
  }
});

reportsRouter.get("/export.pdf", requireAuth, requireSection("reports", "read"), async (_request, response, next) => {
  try {
    const pdf = await reportsPdf(prisma);
    response.type("application/pdf").send(pdf);
  } catch (error) {
    next(error);
  }
});
