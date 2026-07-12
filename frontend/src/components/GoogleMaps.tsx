import type { Trip } from "../lib/types";

/** India-focused Google Maps helpers (no paid Maps JS SDK required). */

export function googleDirectionsUrl(origin: string, destination: string) {
  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "driving"
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function googleDirectionsEmbedUrl(origin: string, destination: string) {
  const params = new URLSearchParams({
    saddr: origin,
    daddr: destination,
    hl: "en",
    output: "embed"
  });
  return `https://maps.google.com/maps?${params.toString()}`;
}

export function googleMapsSearchEmbedUrl(query: string) {
  const params = new URLSearchParams({
    q: query,
    hl: "en",
    z: "11",
    output: "embed"
  });
  return `https://maps.google.com/maps?${params.toString()}`;
}

export function GoogleRouteMap({
  origin,
  destination,
  height = 360
}: {
  origin: string;
  destination: string;
  height?: number;
}) {
  if (!origin.trim() || !destination.trim()) {
    return (
      <div className="gmaps-empty" style={{ minHeight: height }}>
        <p>Enter start and end locations to show the Google Maps route.</p>
      </div>
    );
  }

  return (
    <div className="gmaps-wrap">
      <iframe
        title={`Route ${origin} to ${destination}`}
        className="gmaps-frame"
        style={{ height }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={googleDirectionsEmbedUrl(origin, destination)}
        allowFullScreen
      />
      <div className="gmaps-actions">
        <a className="btn-secondary btn-sm" href={googleDirectionsUrl(origin, destination)} target="_blank" rel="noreferrer">
          Open in Google Maps
        </a>
      </div>
    </div>
  );
}

export function TripMapsPanel({ trips }: { trips: Trip[] }) {
  const active = trips.filter((t) => t.status === "DISPATCHED");
  if (active.length === 0) {
    return (
      <div className="gmaps-empty">
        <p>No active dispatches. After you dispatch a trip, add start/end locations and the driver&apos;s Google Maps live link.</p>
      </div>
    );
  }

  const focus = active[0]!;
  return (
    <div className="trip-maps-panel">
      <GoogleRouteMap origin={focus.source} destination={focus.destination} height={380} />
      <div className="trip-maps-list">
        {active.map((trip) => (
          <div key={trip.id} className="trip-maps-row">
            <div>
              <strong>{trip.vehicle?.registrationNumber ?? "Vehicle"}</strong>
              <p className="muted">
                {trip.source} → {trip.destination}
                {trip.driver?.name ? ` · ${trip.driver.name}` : ""}
              </p>
            </div>
            <div className="trip-maps-links">
              <a
                className="btn-ghost-sm"
                href={googleDirectionsUrl(trip.source, trip.destination)}
                target="_blank"
                rel="noreferrer"
              >
                Route
              </a>
              {trip.liveLocationUrl ? (
                <a className="btn-primary-sm" href={trip.liveLocationUrl} target="_blank" rel="noreferrer">
                  Live location
                </a>
              ) : (
                <span className="muted">No live link yet</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
