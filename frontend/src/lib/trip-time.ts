import type { Trip } from "./types";

export function tripDispatchTime(trip: Trip): string | null {
  if (trip.dispatchedAt) return trip.dispatchedAt;
  if (trip.status === "DISPATCHED" && trip.updatedAt) return trip.updatedAt;
  return null;
}
