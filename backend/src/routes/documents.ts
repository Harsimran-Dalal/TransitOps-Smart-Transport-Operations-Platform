import { Router } from "express";
import multer from "multer";
import { createReadStream, existsSync } from "fs";
import { join } from "path";
import { prisma } from "../db/prisma.js";
import { requireAuth, requireSection } from "../middleware/auth.js";
import { paramId } from "../lib/params.js";
import {
  deleteVehicleDocument,
  ensureUploadDir,
  getUploadDir,
  listVehicleDocuments,
  saveVehicleDocument
} from "../services/documents.js";
import { testLicenseReminder } from "../services/notifications.js";
import { getNotificationFeed } from "../services/notifications-feed.js";

export const documentsRouter = Router();
export const notificationsRouter = Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (request, _file, cb) => {
      const vehicleId = paramId(request.params.vehicleId, "vehicleId");
      cb(null, ensureUploadDir(vehicleId));
    },
    filename: (_request, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }
});

documentsRouter.get(
  "/vehicles/:vehicleId/documents",
  requireAuth,
  requireSection("vehicles", "read"),
  async (request, response, next) => {
    try {
      response.json(await listVehicleDocuments(prisma, paramId(request.params.vehicleId, "vehicleId")));
    } catch (error) {
      next(error);
    }
  }
);

documentsRouter.post(
  "/vehicles/:vehicleId/documents",
  requireAuth,
  requireSection("vehicles", "write"),
  upload.single("file"),
  async (request, response, next) => {
    try {
      if (!request.file) {
        response.status(400).json({ error: "File is required" });
        return;
      }
      const doc = await saveVehicleDocument(prisma, {
        vehicleId: paramId(request.params.vehicleId, "vehicleId"),
        fileName: request.file.originalname,
        filePath: join(request.file.destination, request.file.filename),
        mimeType: request.file.mimetype
      });
      response.status(201).json(doc);
    } catch (error) {
      next(error);
    }
  }
);

documentsRouter.get("/documents/:id/download", requireAuth, requireSection("vehicles", "read"), async (request, response, next) => {
  try {
    const doc = await prisma.vehicleDocument.findUnique({ where: { id: paramId(request.params.id) } });
    if (!doc) {
      response.status(404).json({ error: "Document not found" });
      return;
    }
    if (!existsSync(doc.filePath)) {
      response.status(404).json({ error: "File no longer available on server" });
      return;
    }
    response.setHeader("Content-Type", doc.mimeType);
    response.setHeader("Content-Disposition", `attachment; filename="${doc.fileName}"`);
    createReadStream(doc.filePath).pipe(response);
  } catch (error) {
    next(error);
  }
});

documentsRouter.delete("/documents/:id", requireAuth, requireSection("vehicles", "write"), async (request, response, next) => {
  try {
    await deleteVehicleDocument(prisma, paramId(request.params.id));
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

notificationsRouter.get("/feed", requireAuth, async (request, response, next) => {
  try {
    response.json(await getNotificationFeed(prisma, request.user!.role));
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post(
  "/test-license-reminders",
  requireAuth,
  requireSection("drivers", "write"),
  async (_request, response, next) => {
    try {
      response.json(await testLicenseReminder(prisma));
    } catch (error) {
      next(error);
    }
  }
);

export { getUploadDir };
