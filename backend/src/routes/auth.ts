import { Router } from "express";

import rateLimit from "express-rate-limit";

import { Role } from "@prisma/client";

import { accountCreateSchema, loginSchema, registerSchema } from "@transitops/shared";

import { prisma } from "../db/prisma.js";

import { requireAuth, requireRole, requireSection } from "../middleware/auth.js";

import { getCurrentUser, listAccounts, loginUser, registerUser, removeUser, signupUser } from "../services/auth.js";

import { paramId } from "../lib/params.js";

import { sessionCookieOptions } from "../lib/security.js";

import { ApiError } from "../lib/errors.js";



export const authRouter = Router();



const authLimiter = rateLimit({

  windowMs: 15 * 60_000,

  limit: 20,

  standardHeaders: "draft-7",

  legacyHeaders: false,

  message: { error: "Too many attempts. Try again in 15 minutes." }

});



authRouter.post("/register", authLimiter, async (request, response, next) => {

  try {

    const body = registerSchema.parse(request.body);

    const result = await signupUser(prisma, body);

    response.cookie("session", result.token, sessionCookieOptions());

    response.status(201).json(result.user);

  } catch (error) {

    next(error);

  }

});



authRouter.post("/login", authLimiter, async (request, response, next) => {

  try {

    const body = loginSchema.parse(request.body);

    const result = await loginUser(prisma, body);

    response.cookie("session", result.token, sessionCookieOptions());

    response.json(result.user);

  } catch (error) {

    next(error);

  }

});



authRouter.post("/logout", (_request, response) => {

  response.clearCookie("session", { ...sessionCookieOptions(), maxAge: 0 });

  response.status(204).send();

});



authRouter.get("/me", requireAuth, async (request, response, next) => {

  try {

    response.json(await getCurrentUser(prisma, request.user!.id));

  } catch (error) {

    next(error);

  }

});



authRouter.get("/accounts", requireAuth, requireSection("settings", "write"), async (_request, response, next) => {

  try {

    response.json(await listAccounts(prisma));

  } catch (error) {

    next(error);

  }

});



authRouter.post("/accounts", requireAuth, requireSection("settings", "write"), async (request, response, next) => {

  try {

    const body = accountCreateSchema.parse(request.body);

    response.status(201).json(await registerUser(prisma, body));

  } catch (error) {

    next(error);

  }

});



authRouter.delete("/me", requireAuth, async (request, response, next) => {
  try {
    await removeUser(prisma, request.user!.id);
    response.clearCookie("session", { ...sessionCookieOptions(), maxAge: 0 });
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});



authRouter.delete("/accounts/:id", requireAuth, requireSection("settings", "write"), async (request, response, next) => {

  try {

    const id = paramId(request.params.id);

    if (id === request.user!.id) throw new ApiError(400, "You cannot remove your own account");

    await removeUser(prisma, id);

    response.status(204).send();

  } catch (error) {

    next(error);

  }

});

