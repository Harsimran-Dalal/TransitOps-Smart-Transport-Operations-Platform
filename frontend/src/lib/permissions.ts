import type { Role } from "@transitops/shared";
import {
  canReadSection as canRead,
  canWriteSection as canWrite,
  permissionMatrix
} from "@transitops/shared";

export { canRead, canWrite, permissionMatrix };

export function roleLabel(role: Role) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const ROLES: { value: Role; label: string; description: string }[] = [
  { value: "FLEET_MANAGER", label: "Fleet Manager", description: "Full access — fleet, drivers, dispatch, maintenance" },
  { value: "DRIVER", label: "Driver / Dispatcher", description: "Creates trips, assigns vehicles and drivers" },
  { value: "SAFETY_OFFICER", label: "Safety Officer", description: "Driver compliance and safety scores" },
  { value: "FINANCIAL_ANALYST", label: "Financial Analyst", description: "Costs, fuel, and profitability" }
];
