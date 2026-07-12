import { Prisma, PrismaClient, Role } from "@prisma/client";

import { ApiError } from "../lib/errors.js";

import { hashPassword, signSession, verifyPassword } from "../lib/security.js";



type Db = PrismaClient | Prisma.TransactionClient;



export async function registerUser(

  db: Db,

  input: { email: string; password: string; role: Role; driverId?: string }

) {

  const email = input.email.toLowerCase();

  const existing = await db.user.findUnique({ where: { email } });

  if (existing) throw new ApiError(409, "An account with that email already exists");



  const passwordHash = await hashPassword(input.password);

  const user = await db.user.create({

    data: {

      email,

      passwordHash,

      authProvider: "local",

      role: input.role,

      driverId: input.driverId ?? null

    }

  });

  return {

    id: user.id,

    email: user.email,

    role: user.role,

    driverId: user.driverId,

    authProvider: user.authProvider,

    createdAt: user.createdAt

  };

}



export async function signupUser(db: Db, input: { email: string; password: string; role: Role }) {

  await registerUser(db, input);

  return loginUser(db, { email: input.email, password: input.password });

}



export async function loginUser(db: Db, input: { email: string; password: string }) {

  const user = await db.user.findUnique({ where: { email: input.email.toLowerCase() } });

  if (!user?.passwordHash) {

    throw new ApiError(401, "Invalid email or password");

  }

  if (!(await verifyPassword(input.password, user.passwordHash))) {

    throw new ApiError(401, "Invalid email or password");

  }



  return {

    user: { id: user.id, email: user.email, role: user.role, driverId: user.driverId, name: user.name, avatarUrl: user.avatarUrl },

    token: signSession({ id: user.id, email: user.email, role: user.role as never })

  };

}



export async function getCurrentUser(db: Db, userId: string) {

  const user = await db.user.findUnique({ where: { id: userId } });

  if (!user) throw new ApiError(404, "User not found");

  return {

    id: user.id,

    email: user.email,

    role: user.role,

    driverId: user.driverId,

    name: user.name,

    avatarUrl: user.avatarUrl,

    authProvider: user.authProvider

  };

}



export async function listAccounts(db: Db) {

  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });

  return users.map((u) => ({

    id: u.id,

    email: u.email,

    role: u.role,

    driverId: u.driverId,

    name: u.name,

    authProvider: u.authProvider,

    createdAt: u.createdAt

  }));

}



export async function removeUser(db: Db, id: string) {

  const existing = await db.user.findUnique({ where: { id } });

  if (!existing) throw new ApiError(404, "Account not found");

  await db.user.delete({ where: { id } });

}

