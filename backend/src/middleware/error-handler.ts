import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ApiError } from "../lib/errors.js";

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction) {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: "Validation failed",
      details: error.flatten().fieldErrors
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    response.status(409).json({ error: "Unique constraint violated" });
    return;
  }

  if (error instanceof Error) {
    // eslint-disable-next-line no-console
    console.error("Unhandled error:", error);
  }

  const message = process.env.NODE_ENV === "production"
    ? "Internal server error"
    : error instanceof Error
      ? error.message
      : "Internal server error";

  response.status(500).json({ error: message });
}
