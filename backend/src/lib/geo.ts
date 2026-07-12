/** Demo geocoding for fleet map — maps trip location names to coordinates (Mumbai metro area). */

const KNOWN: Record<string, { lat: number; lng: number }> = {
  depot: { lat: 19.0896, lng: 72.8656 },
  warehouse: { lat: 19.1028, lng: 72.9102 },
  harbor: { lat: 18.94, lng: 72.835 },
  port: { lat: 18.94, lng: 72.835 },
  airport: { lat: 19.0896, lng: 72.8656 },
  factory: { lat: 19.1663, lng: 72.8526 },
  mall: { lat: 19.1136, lng: 72.8697 },
  client: { lat: 19.076, lng: 72.8777 },
  downtown: { lat: 19.076, lng: 72.8777 },
  north: { lat: 19.2183, lng: 72.9781 },
  south: { lat: 18.96, lng: 72.82 },
  east: { lat: 19.07, lng: 72.95 },
  west: { lat: 19.08, lng: 72.78 }
};

function hashOffset(label: string) {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  const lat = ((h % 1000) / 1000 - 0.5) * 0.08;
  const lng = (((h >> 10) % 1000) / 1000 - 0.5) * 0.08;
  return { lat, lng };
}

export function resolveLocation(name: string) {
  const key = name.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "");
  for (const [k, coords] of Object.entries(KNOWN)) {
    if (key.includes(k)) return { ...coords, label: name };
  }
  const off = hashOffset(key || "hub");
  return { lat: 19.076 + off.lat, lng: 72.8777 + off.lng, label: name };
}

export function interpolateRoute(
  source: string,
  destination: string,
  progress: number
): { lat: number; lng: number; from: { lat: number; lng: number }; to: { lat: number; lng: number } } {
  const from = resolveLocation(source);
  const to = resolveLocation(destination);
  const t = Math.max(0, Math.min(0.95, progress));
  return {
    lat: from.lat + (to.lat - from.lat) * t,
    lng: from.lng + (to.lng - from.lng) * t,
    from: { lat: from.lat, lng: from.lng },
    to: { lat: to.lat, lng: to.lng }
  };
}

export function estimateProgress(dispatchedAt: Date | null, plannedDistanceKm: number) {
  if (!dispatchedAt) return 0;
  const avgSpeedKmh = 35;
  const plannedHours = Math.max(plannedDistanceKm / avgSpeedKmh, 0.35);
  const elapsedHours = (Date.now() - dispatchedAt.getTime()) / 3_600_000;
  return elapsedHours / plannedHours;
}
