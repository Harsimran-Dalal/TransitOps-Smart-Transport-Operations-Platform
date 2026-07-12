import { Router } from "express";
import { aiAskSchema } from "@transitops/shared";
import { prisma } from "../db/prisma.js";
import { requireAuth, requireSection } from "../middleware/auth.js";
import { askFleetCopilot } from "../services/ai-assistant.js";
import { getFleetMapSummary } from "../services/tracking.js";

export const trackingRouter = Router();
export const aiRouter = Router();

trackingRouter.get("/live", requireAuth, requireSection("dashboard", "read"), async (_request, response, next) => {
  try {
    response.json(await getFleetMapSummary(prisma));
  } catch (error) {
    next(error);
  }
});

aiRouter.post("/ask", requireAuth, requireSection("dashboard", "read"), async (request, response, next) => {
  try {
    const body = aiAskSchema.parse(request.body);
    response.json(await askFleetCopilot(prisma, body.question));
  } catch (error) {
    next(error);
  }
});

aiRouter.get("/status", requireAuth, async (_request, response) => {
  response.json({ enabled: Boolean(process.env.GEMINI_API_KEY?.trim()) });
});
