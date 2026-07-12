import { Fragment, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { LiveVehicleTrack } from "../lib/types";

function FitBounds({ tracks }: { tracks: LiveVehicleTrack[] }) {
  const map = useMap();
  useEffect(() => {
    if (tracks.length === 0) return;
    const points: [number, number][] = tracks.flatMap((t) => [
      [t.lat, t.lng],
      [t.route.from.lat, t.route.from.lng],
      [t.route.to.lat, t.route.to.lng]
    ]);
    map.fitBounds(points, { padding: [40, 40], maxZoom: 13 });
  }, [map, tracks]);
  return null;
}

export function FleetMap({ tracks }: { tracks: LiveVehicleTrack[] }) {
  const center = useMemo<[number, number]>(() => {
    if (tracks.length === 0) return [19.076, 72.8777];
    const avgLat = tracks.reduce((s, t) => s + t.lat, 0) / tracks.length;
    const avgLng = tracks.reduce((s, t) => s + t.lng, 0) / tracks.length;
    return [avgLat, avgLng];
  }, [tracks]);

  return (
    <div className="fleet-map-wrap">
      <MapContainer center={center} zoom={11} scrollWheelZoom className="fleet-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <FitBounds tracks={tracks} />
        {tracks.map((track) => (
          <Fragment key={track.tripId}>
            <Polyline
              positions={[
                [track.route.from.lat, track.route.from.lng],
                [track.route.to.lat, track.route.to.lng]
              ]}
              pathOptions={{ color: "rgba(249, 115, 22, 0.45)", weight: 3, dashArray: "6 8" }}
            />
            <CircleMarker
              center={[track.lat, track.lng]}
              radius={10}
              pathOptions={{
                color: "#f97316",
                fillColor: "#f97316",
                fillOpacity: 0.9,
                weight: 2
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent={false}>
                <strong>{track.registrationNumber}</strong>
                <br />
                {track.driverName} · {track.elapsedMinutes}m en route
                <br />
                {track.source} → {track.destination}
              </Tooltip>
            </CircleMarker>
          </Fragment>
        ))}
      </MapContainer>
      {tracks.length === 0 && (
        <div className="fleet-map-empty">
          <p>No live vehicles on map</p>
          <span className="muted">Dispatch a trip to see live route tracking</span>
        </div>
      )}
    </div>
  );
}
