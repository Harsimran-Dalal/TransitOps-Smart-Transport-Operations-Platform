import { Bike, CarFront, HelpCircle, Package, Truck, type LucideIcon } from "lucide-react";
import type { VehicleType } from "@transitops/shared";
import { VEHICLE_TYPE_LABELS } from "@transitops/shared";

const VEHICLE_TYPE_ICONS: Record<VehicleType, LucideIcon> = {
  TRUCK: Truck,
  VAN: CarFront,
  BIKE: Bike,
  OTHER: Package
};

function normalizeType(type: string): VehicleType {
  if (type in VEHICLE_TYPE_ICONS) return type as VehicleType;
  return "OTHER";
}

export type VehicleTypeIconProps = {
  type: VehicleType | string;
  size?: number;
  showLabel?: boolean;
  className?: string;
};

export function VehicleTypeIcon({
  type,
  size = 16,
  showLabel = false,
  className = ""
}: VehicleTypeIconProps) {
  const normalized = normalizeType(type);
  const Icon = VEHICLE_TYPE_ICONS[normalized] ?? HelpCircle;
  const label = VEHICLE_TYPE_LABELS[normalized] ?? type;

  if (showLabel) {
    return (
      <span className={`vehicle-type-badge${className ? ` ${className}` : ""}`} title={label}>
        <Icon size={size} className="vehicle-type-badge__icon" aria-hidden />
        <span className="vehicle-type-badge__label">{label}</span>
      </span>
    );
  }

  return <Icon size={size} className={`vehicle-type-icon${className ? ` ${className}` : ""}`} aria-label={label} />;
}
