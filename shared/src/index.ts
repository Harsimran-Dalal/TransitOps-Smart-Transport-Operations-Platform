import { z } from "zod";

export const roleSchema = z.enum(["FLEET_MANAGER", "DRIVER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"]);
export const vehicleStatusSchema = z.enum(["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"]);
export const driverStatusSchema = z.enum(["AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"]);
export const tripStatusSchema = z.enum(["DRAFT", "DISPATCHED", "COMPLETED", "CANCELLED"]);
export const vehicleTypeSchema = z.enum(["TRUCK", "VAN", "BIKE", "OTHER"]);

export const decimalString = z.string().regex(/^\d+(\.\d+)?$/);

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: roleSchema
});

export const accountCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: roleSchema
});

export const aiAskSchema = z.object({
  question: z.string().min(2).max(500)
});

export const vehicleUpsertSchema = z.object({
  registrationNumber: z.string().min(2),
  nameModel: z.string().min(2),
  type: vehicleTypeSchema,
  maximumLoadCapacity: decimalString,
  odometer: decimalString,
  acquisitionCost: decimalString,
  region: z.string().min(1),
  status: vehicleStatusSchema
});

export const driverUpsertSchema = z.object({
  name: z.string().min(2),
  licenseNumber: z.string().min(2),
  licenseCategory: z.string().min(1),
  licenseExpiryDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  contactNumber: z.string().min(5),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  safetyScore: z.number().min(0).max(100),
  status: driverStatusSchema
});

export const tripUpsertSchema = z.object({
  source: z.string().min(1),
  destination: z.string().min(1),
  vehicleId: z.string().uuid(),
  driverId: z.string().uuid(),
  cargoWeight: decimalString,
  plannedDistance: decimalString,
  revenue: decimalString.default("0")
});

export const tripTrackingSchema = z.object({
  source: z.string().min(2).max(200),
  destination: z.string().min(2).max(200),
  liveLocationUrl: z.string().max(2000).optional()
});

export const tripCompleteSchema = z.object({
  finalOdometer: decimalString,
  fuelConsumed: decimalString
});

export const maintenanceCreateSchema = z.object({
  vehicleId: z.string().uuid(),
  description: z.string().min(1),
  cost: decimalString
});

export const fuelLogCreateSchema = z.object({
  vehicleId: z.string().uuid(),
  liters: decimalString,
  cost: decimalString
});

export const expenseCreateSchema = z.object({
  vehicleId: z.string().uuid(),
  type: z.string().min(1),
  amount: decimalString
});

export const listQuerySchema = z.object({
  q: z.string().optional(),
  sort: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.string().optional(),
  status: z.string().optional(),
  region: z.string().optional()
});

export const dashboardQuerySchema = z.object({
  type: z.string().optional(),
  status: z.string().optional(),
  region: z.string().optional()
});

export type Role = z.infer<typeof roleSchema>;
export type VehicleStatus = z.infer<typeof vehicleStatusSchema>;
export type DriverStatus = z.infer<typeof driverStatusSchema>;
export type TripStatus = z.infer<typeof tripStatusSchema>;
export type VehicleType = z.infer<typeof vehicleTypeSchema>;

export * from "./permissions.js";
export * from "./vehicle-types.js";
