import { PrismaClient, TripStatus } from "@prisma/client";
import { decimalToNumber } from "../lib/utils.js";
import { estimateProgress, interpolateRoute, resolveLocation } from "../lib/geo.js";

type Db = PrismaClient;

export type LiveVehicleTrack = {
  tripId: string;
  vehicleId: string;
  registrationNumber: string;
  driverName: string;
  source: string;
  destination: string;
  status: string;
  lat: number;
  lng: number;
  progress: number;
  route: {
    from: { lat: number; lng: number; label: string };
    to: { lat: number; lng: number; label: string };
  };
  dispatchedAt: string | null;
  elapsedMinutes: number;
};

export async function getLiveFleetTracks(db: Db): Promise<LiveVehicleTrack[]> {
  const trips = await db.trip.findMany({
    where: { status: TripStatus.DISPATCHED },
    include: { vehicle: true, driver: true },
    orderBy: { dispatchedAt: "desc" }
  });

  return trips.map((trip) => {
    const distance = decimalToNumber(trip.plannedDistance);
    const dispatchTime =
      trip.dispatchedAt ?? (trip.status === TripStatus.DISPATCHED ? trip.updatedAt : null);
    const progress = estimateProgress(dispatchTime, distance);
    const pos = interpolateRoute(trip.source, trip.destination, progress);
    const from = resolveLocation(trip.source);
    const to = resolveLocation(trip.destination);
    const elapsedMinutes = dispatchTime
      ? Math.floor((Date.now() - dispatchTime.getTime()) / 60_000)
      : 0;

    return {
      tripId: trip.id,
      vehicleId: trip.vehicleId,
      registrationNumber: trip.vehicle.registrationNumber,
      driverName: trip.driver.name,
      source: trip.source,
      destination: trip.destination,
      status: trip.status,
      lat: pos.lat,
      lng: pos.lng,
      progress,
      route: {
        from: { lat: from.lat, lng: from.lng, label: trip.source },
        to: { lat: to.lat, lng: to.lng, label: trip.destination }
      },
      dispatchedAt: dispatchTime?.toISOString() ?? null,
      elapsedMinutes
    };
  });
}

export async function getFleetMapSummary(db: Db) {
  const [tracks, available, onTrip, inShop, pending] = await Promise.all([
    getLiveFleetTracks(db),
    db.vehicle.count({ where: { status: "AVAILABLE" } }),
    db.vehicle.count({ where: { status: "ON_TRIP" } }),
    db.vehicle.count({ where: { status: "IN_SHOP" } }),
    db.trip.count({ where: { status: TripStatus.DRAFT } })
  ]);

  return { tracks, stats: { available, onTrip, inShop, pending, live: tracks.length } };
}
