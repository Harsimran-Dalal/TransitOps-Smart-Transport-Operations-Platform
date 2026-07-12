import { useMemo } from "react";
import { ExternalLink, Clock, MapPin, Truck, User } from "lucide-react";
import type { Trip } from "../lib/types";
import { googleDirectionsUrl } from "./GoogleMaps";

function formatElapsed(iso?: string | null) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "Just now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m en route`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m en route`;
}

export function DispatchTrackingBoard({ trips }: { trips: Trip[] }) {
  const active = useMemo(() => trips.filter((t) => t.status === "DISPATCHED"), [trips]);

  if (active.length === 0) {
    return (
      <div className="dispatch-board empty">
        <p className="muted">No vehicles currently on dispatch. Dispatched trips appear here with live elapsed time.</p>
      </div>
    );
  }

  return (
    <div className="dispatch-board">
      <div className="table-wrap">
        <table className="dispatch-table">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Driver</th>
              <th>Route</th>
              <th>Dispatched</th>
              <th>Elapsed</th>
              <th>Maps</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {active.map((trip) => (
              <tr key={trip.id}>
                <td>
                  <span className="dispatch-cell">
                    <Truck size={14} />
                    {trip.vehicle?.registrationNumber ?? "—"}
                  </span>
                </td>
                <td>
                  <span className="dispatch-cell">
                    <User size={14} />
                    {trip.driver?.name ?? "—"}
                  </span>
                </td>
                <td>
                  <span className="dispatch-cell">
                    <MapPin size={14} />
                    {trip.source} → {trip.destination}
                  </span>
                </td>
                <td>{trip.dispatchedAt ? new Date(trip.dispatchedAt).toLocaleString() : "—"}</td>
                <td>
                  <span className="dispatch-elapsed">
                    <Clock size={14} />
                    {formatElapsed(trip.dispatchedAt)}
                  </span>
                </td>
                <td>
                  <div className="dispatch-links">
                    <a className="btn-ghost-sm" href={googleDirectionsUrl(trip.source, trip.destination)} target="_blank" rel="noreferrer">
                      Route
                    </a>
                    {trip.liveLocationUrl ? (
                      <a className="btn-ghost-sm" href={trip.liveLocationUrl} target="_blank" rel="noreferrer">
                        <ExternalLink size={12} /> Live
                      </a>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </div>
                </td>
                <td>
                  <span className="dispatch-live-pill">On dispatch</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
