import type { CookieOptions } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Role } from "@transitops/shared";

const isProd = process.env.NODE_ENV === "production";

function readJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    if (isProd) {
      throw new Error("JWT_SECRET must be set to at least 16 characters in production");
    }
    return "dev-only-secret-do-not-use-in-prod";
  }
  return secret;
}

const jwtSecret = readJwtSecret();

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signSession(user: { id: string; email: string; role: Role }) {
  return jwt.sign(user, jwtSecret, { expiresIn: "8h" });
}

export function verifySession(token: string) {
  return jwt.verify(token, jwtSecret) as { id: string; email: string; role: Role };
}

export function sessionCookieOptions(): CookieOptions {
  const crossSite = process.env.COOKIE_CROSS_SITE === "true" || isProd;
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: crossSite ? "none" : "lax",
    path: "/",
    maxAge: 8 * 60 * 60 * 1000
  };
}
