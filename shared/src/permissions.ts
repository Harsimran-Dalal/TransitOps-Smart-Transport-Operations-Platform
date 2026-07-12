import type { Role } from "./index.js";

type Action = "read" | "write";

export const permissionMatrix: Record<Role, Record<string, Action>> = {
  FLEET_MANAGER: {
    dashboard: "read",
    vehicles: "write",
    drivers: "write",
    trips: "write",
    maintenance: "write",
    fuel: "write",
    reports: "read",
    settings: "write"
  },
  DRIVER: {
    dashboard: "read",
    vehicles: "read",
    drivers: "read",
    trips: "write",
    maintenance: "read",
    fuel: "read",
    settings: "read"
  },
  SAFETY_OFFICER: {
    dashboard: "read",
    vehicles: "read",
    drivers: "write",
    trips: "read",
    maintenance: "read",
    fuel: "read",
    reports: "read",
    settings: "read"
  },
  FINANCIAL_ANALYST: {
    dashboard: "read",
    vehicles: "read",
    drivers: "read",
    trips: "read",
    maintenance: "read",
    fuel: "write",
    reports: "read",
    settings: "read"
  }
};

export function canReadSection(role: Role, section: string) {
  return permissionMatrix[role]?.[section] !== undefined;
}

export function canWriteSection(role: Role, section: string) {
  return permissionMatrix[role]?.[section] === "write";
}

export const routeSectionMap: Record<string, string> = {
  "/dashboard": "dashboard",
  "/vehicles": "vehicles",
  "/drivers": "drivers",
  "/trips": "trips",
  "/maintenance": "maintenance",
  "/fuel-logs": "fuel",
  "/expenses": "fuel",
  "/reports": "reports",
  "/notifications": "dashboard",
  "/tracking": "dashboard",
  "/ai": "dashboard"
};
