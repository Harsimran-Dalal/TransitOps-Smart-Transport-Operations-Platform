import { Prisma } from "@prisma/client";
import { ApiError } from "./errors.js";

export function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  return value == null ? 0 : Number(value);
}

export function parsePositiveDecimal(value: string, field: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ApiError(400, `${field} must be a non-negative number`);
  }
  return new Prisma.Decimal(value);
}

export function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit))
  };
}

export function parseSort(sort?: string, allowed: string[] = ["createdAt"]) {
  if (!sort) return { [allowed[0] ?? "createdAt"]: "desc" as const };
  const desc = sort.startsWith("-");
  const field = desc ? sort.slice(1) : sort;
  if (!allowed.includes(field)) return { createdAt: "desc" as const };
  return { [field]: desc ? "desc" : "asc" } as Record<string, "asc" | "desc">;
}
