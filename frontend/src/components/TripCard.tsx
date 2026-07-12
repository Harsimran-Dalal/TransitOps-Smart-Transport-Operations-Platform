import { motion } from "framer-motion";
import type { Trip } from "../lib/types";
import { StatusBadge } from "./ui";

function formatElapsed(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export function TripCard({
  trip,
  actions,
  index = 0
}: {
  trip: Trip;
  actions?: React.ReactNode;
  index?: number;
}) {
  return (
    <motion.article
      className="trip-card"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <div className="trip-card-route">
        <div className="route-point">
          <span className="route-dot start" />
          <div>
            <span className="route-label">Pickup</span>
            <strong>{trip.source}</strong>
          </div>
        </div>
        <div className="route-line">
          <motion.div
            className="route-progress"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: 0.2 + index * 0.05, duration: 0.5 }}
          />
        </div>
        <div className="route-point">
          <span className="route-dot end" />
          <div>
            <span className="route-label">Drop-off</span>
            <strong>{trip.destination}</strong>
          </div>
        </div>
      </div>

      <div className="trip-card-meta">
        <div>
          <span className="meta-label">Vehicle</span>
          <span>{trip.vehicle?.registrationNumber ?? "—"}</span>
        </div>
        <div>
          <span className="meta-label">Driver</span>
          <span>{trip.driver?.name ?? "—"}</span>
        </div>
        <div>
          <span className="meta-label">Cargo</span>
          <span>{trip.cargoWeight} kg</span>
        </div>
        {trip.status === "DISPATCHED" && trip.dispatchedAt && (
          <div>
            <span className="meta-label">En route</span>
            <span>{formatElapsed(trip.dispatchedAt)}</span>
          </div>
        )}
        {trip.liveLocationUrl && (
          <div className="trip-live-link">
            <a href={trip.liveLocationUrl} target="_blank" rel="noreferrer">
              Driver live location
            </a>
          </div>
        )}
        <StatusBadge status={trip.status} />
      </div>

      {actions && <div className="trip-card-actions">{actions}</div>}
    </motion.article>
  );
}

export function FleetStatusBar({
  available,
  onTrip,
  inShop,
  total
}: {
  available: number;
  onTrip: number;
  inShop: number;
  total: number;
}) {
  const pct = (n: number) => (total ? (n / total) * 100 : 0);
  return (
    <div className="fleet-status-bar">
      <motion.div
        className="bar-segment available"
        initial={{ width: 0 }}
        animate={{ width: `${pct(available)}%` }}
        transition={{ duration: 1, delay: 0.2 }}
        title={`Available: ${available}`}
      />
      <motion.div
        className="bar-segment on-trip"
        initial={{ width: 0 }}
        animate={{ width: `${pct(onTrip)}%` }}
        transition={{ duration: 1, delay: 0.35 }}
        title={`On trip: ${onTrip}`}
      />
      <motion.div
        className="bar-segment in-shop"
        initial={{ width: 0 }}
        animate={{ width: `${pct(inShop)}%` }}
        transition={{ duration: 1, delay: 0.5 }}
        title={`In shop: ${inShop}`}
      />
    </div>
  );
}

