/** Human-readable labels for each VehicleType enum value. */
export const VEHICLE_TYPE_LABELS: Record<"TRUCK" | "VAN" | "BIKE" | "OTHER", string> = {
  TRUCK: "Truck",
  VAN: "Van",
  BIKE: "Bike",
  OTHER: "Other"
};

/** Ordered list for form/filter dropdowns — matches Prisma VehicleType enum. */
export const VEHICLE_TYPE_OPTIONS: { value: "TRUCK" | "VAN" | "BIKE" | "OTHER"; label: string }[] = [
  { value: "VAN", label: VEHICLE_TYPE_LABELS.VAN },
  { value: "TRUCK", label: VEHICLE_TYPE_LABELS.TRUCK },
  { value: "BIKE", label: VEHICLE_TYPE_LABELS.BIKE },
  { value: "OTHER", label: VEHICLE_TYPE_LABELS.OTHER }
];

/**
 * Infer a sensible VehicleType from a model name.
 * Used by seed normalization, production backfill, and the vehicle form.
 *
 * Mapping (no PICKUP in schema — light pickups map to VAN):
 * - Tata LPT / Tata Truck → TRUCK
 * - Tata Ace, Mahindra Bolero, Ashok Leyland Dost → VAN
 */
export function inferVehicleTypeFromModel(nameModel: string): "TRUCK" | "VAN" | "BIKE" | "OTHER" | null {
  const n = nameModel.trim().toLowerCase();
  if (!n) return null;

  if (/\b(truck|lpt|tractor|trailer|hcv|multi[\s-]?axle)\b/.test(n)) {
    return "TRUCK";
  }
  if (/\b(bike|motorcycle|scooter|two[\s-]?wheeler)\b/.test(n)) {
    return "BIKE";
  }
  if (/\b(ace|bolero|dost|pickup|tempo|van|omni|eicher|tigor|innova|xylo)\b/.test(n)) {
    return "VAN";
  }

  return null;
}
