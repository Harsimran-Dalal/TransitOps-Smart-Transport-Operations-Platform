import { NextFunction, Request, Response } from "express";
import { canReadSection, canWriteSection, type Role } from "@transitops/shared";
import { ApiError } from "../lib/errors.js";
import { verifySession } from "../lib/security.js";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: Role };
    }
  }
}

export function requireAuth(request: Request, _response: Response, next: NextFunction) {
  const bearer = request.headers.authorization;
  const cookieToken = request.cookies?.session;
  const token = bearer?.startsWith("Bearer ") ? bearer.slice(7) : cookieToken;

  if (!token) {
    return next(new ApiError(401, "Authentication required"));
  }

  try {
    request.user = verifySession(token);
    return next();
  } catch {
    return next(new ApiError(401, "Invalid or expired session"));
  }
}

export function requireSection(section: string, access: "read" | "write" = "read") {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.user) {
      return next(new ApiError(401, "Authentication required"));
    }
    const allowed =
      access === "write"
        ? canWriteSection(request.user.role, section)
        : canReadSection(request.user.role, section);
    if (!allowed) {
      return next(new ApiError(403, "Insufficient permissions"));
    }
    return next();
  };
}

export function requireRole(...allowedRoles: Role[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.user) {
      return next(new ApiError(401, "Authentication required"));
    }
    if (!allowedRoles.includes(request.user.role)) {
      return next(new ApiError(403, "Insufficient permissions"));
    }
    return next();
  };
}
