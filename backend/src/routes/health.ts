import { Router } from "express";
import { prisma } from "../db/prisma.js";

export const healthRouter = Router();

healthRouter.get("/", async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.json({ status: "ok", service: "transitops-api", db: "up" });
  } catch (error) {
    response.status(503).json({
      status: "degraded",
      service: "transitops-api",
      db: "down",
      error: error instanceof Error ? error.message : "unknown"
    });
  }
});
