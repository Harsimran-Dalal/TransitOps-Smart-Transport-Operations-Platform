import { useState } from "react";
import { getDriverAvatarUrl, getDriverInitials } from "../lib/driver-avatar";

export type DriverAvatarSize = "sm" | "md" | "lg";

export type DriverAvatarProps = {
  driverId?: string | null;
  name?: string | null;
  size?: DriverAvatarSize;
  className?: string;
};

export function DriverAvatar({ driverId, name, size = "md", className = "" }: DriverAvatarProps) {
  const seed = driverId ?? name ?? "driver";
  const [failed, setFailed] = useState(false);
  const initials = getDriverInitials(name);
  const classes = `driver-avatar driver-avatar--${size}${className ? ` ${className}` : ""}`;

  if (failed) {
    return (
      <span className={`${classes} driver-avatar--fallback`} title={name ?? undefined} aria-hidden>
        {initials}
      </span>
    );
  }

  return (
    <img
      src={getDriverAvatarUrl(seed)}
      alt={name ? `${name} avatar` : "Driver avatar"}
      className={classes}
      onError={() => setFailed(true)}
    />
  );
}
