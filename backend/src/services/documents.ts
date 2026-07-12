import { mkdirSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { ApiError } from "../lib/errors.js";

type Db = PrismaClient;

const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";

export async function saveVehicleDocument(
  db: Db,
  input: { vehicleId: string; fileName: string; filePath: string; mimeType: string }
) {
  const vehicle = await db.vehicle.findUnique({ where: { id: input.vehicleId } });
  if (!vehicle) throw new ApiError(404, "Vehicle not found");

  return db.vehicleDocument.create({
    data: {
      vehicleId: input.vehicleId,
      fileName: input.fileName,
      filePath: input.filePath,
      mimeType: input.mimeType
    }
  });
}

export async function listVehicleDocuments(db: Db, vehicleId: string) {
  const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) throw new ApiError(404, "Vehicle not found");
  return db.vehicleDocument.findMany({ where: { vehicleId }, orderBy: { uploadedAt: "desc" } });
}

export async function deleteVehicleDocument(db: Db, documentId: string) {
  const doc = await db.vehicleDocument.findUnique({ where: { id: documentId } });
  if (!doc) throw new ApiError(404, "Document not found");
  await db.vehicleDocument.delete({ where: { id: documentId } });
  return doc;
}

export function ensureUploadDir(vehicleId: string) {
  const dir = join(uploadDir, "vehicles", vehicleId);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function getUploadDir() {
  return uploadDir;
}
