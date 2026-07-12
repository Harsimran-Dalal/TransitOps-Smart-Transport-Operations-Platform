import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, MapPin, Plus } from "lucide-react";
import { motion } from "framer-motion";
import type { Role } from "@transitops/shared";
import { api } from "../lib/api";
import type { Driver, Paginated, SessionUser, Trip, Vehicle } from "../lib/types";
import { canWrite } from "../lib/permissions";
import { liveQueryDefaults } from "../lib/live";
import { useToast } from "../context/ToastContext";
import { TripCard } from "../components/TripCard";
import { DispatchTrackingBoard } from "../components/DispatchTrackingBoard";
import { GoogleRouteMap, googleDirectionsUrl } from "../components/GoogleMaps";
import { ListToolbar } from "../components/ListToolbar";
import { Modal, PageHeader, Panel, EmptyState } from "../components/ui";
import { staggerContainer, staggerItem } from "../components/motion";
import { INDIA_CITIES } from "../lib/india";

export function TripsPage({ user }: { user: SessionUser }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [completeTrip, setCompleteTrip] = useState<Trip | null>(null);
  const [mapsTrip, setMapsTrip] = useState<Trip | null>(null);
  const [completeForm, setCompleteForm] = useState({ finalOdometer: "0", fuelConsumed: "0" });
  const [mapsForm, setMapsForm] = useState({ source: "", destination: "", liveLocationUrl: "" });
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [sort, setSort] = useState("createdAt:desc");
  const canEdit = canWrite(user.role as Role, "trips");

  const [form, setForm] = useState({
    source: "Andheri West Depot, Mumbai",
    destination: "Nhava Sheva Port, Navi Mumbai",
    vehicleId: "",
    driverId: "",
    cargoWeight: "450",
    plannedDistance: "42",
    revenue: "8500"
  });

  const tripQuery = useMemo(
    () => ({ limit: 50, status: filter || undefined, q: deferredQ || undefined, sort }),
    [filter, deferredQ, sort]
  );

  const { data: trips, isLoading } = useQuery({
    queryKey: ["trips", tripQuery],
    queryFn: async () => (await api.get<Paginated<Trip>>("/trips", { params: tripQuery })).data,
    ...liveQueryDefaults
  });

  const { data: dispatchBoard } = useQuery({
    queryKey: ["trips-dispatch-board"],
    queryFn: async () =>
      (await api.get<Paginated<Trip>>("/trips", { params: { limit: 100, status: "DISPATCHED" } })).data,
    ...liveQueryDefaults
  });

  const { data: options } = useQuery({
    queryKey: ["dispatch-options"],
    queryFn: async () => (await api.get<{ vehicles: Vehicle[]; drivers: Driver[] }>("/vehicles/dispatch-options")).data,
    ...liveQueryDefaults
  });

  const invalidate = () => qc.invalidateQueries();

  const openMapsEditor = (trip: Trip) => {
    setMapsTrip(trip);
    setMapsForm({
      source: trip.source,
      destination: trip.destination,
      liveLocationUrl: trip.liveLocationUrl ?? ""
    });
  };

  const create = useMutation({
    mutationFn: async () => (await api.post("/trips", form)).data,
    onSuccess: async () => {
      setShowCreate(false);
      toast("Trip draft created", "success");
      await invalidate();
    },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast(err.response?.data?.error ?? "Failed to create trip", "error")
  });

  const dispatch = useMutation({
    mutationFn: async (id: string) => (await api.post(`/trips/${id}/dispatch`)).data as Trip,
    onSuccess: (trip) => {
      toast("Trip dispatched — set Google Maps route & live link", "success");
      invalidate();
      openMapsEditor(trip);
    },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast(err.response?.data?.error ?? "Dispatch failed", "error")
  });

  const saveTracking = useMutation({
    mutationFn: async () =>
      (
        await api.patch(`/trips/${mapsTrip!.id}/tracking`, {
          source: mapsForm.source,
          destination: mapsForm.destination,
          liveLocationUrl: mapsForm.liveLocationUrl || undefined
        })
      ).data as Trip,
    onSuccess: async () => {
      toast("Google Maps tracking saved", "success");
      setMapsTrip(null);
      await invalidate();
    },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast(err.response?.data?.error ?? "Could not save tracking", "error")
  });

  const complete = useMutation({
    mutationFn: async () => (await api.post(`/trips/${completeTrip!.id}/complete`, completeForm)).data,
    onSuccess: async () => {
      setCompleteTrip(null);
      toast("Trip completed", "success");
      await invalidate();
    },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast(err.response?.data?.error ?? "Complete failed", "error")
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => (await api.post(`/trips/${id}/cancel`)).data,
    onSuccess: () => {
      toast("Trip cancelled", "info");
      invalidate();
    },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast(err.response?.data?.error ?? "Cancel failed", "error")
  });

  const items = trips?.items ?? [];

  return (
    <>
      <PageHeader
        title="Live Trip Operations"
        subtitle="Dispatch across India · Google Maps route + driver live location sharing"
        actions={
          canEdit && (
            <motion.button
              className="btn-primary"
              onClick={() => setShowCreate(true)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Plus size={16} /> New trip
            </motion.button>
          )
        }
      />

      <Panel delay={0.02}>
        <div className="panel-head">
          <h3>Active dispatch board</h3>
          <span className="muted">Live tracking for every vehicle currently on trip</span>
        </div>
        <DispatchTrackingBoard trips={dispatchBoard?.items ?? []} />
      </Panel>

      <Panel>
        <ListToolbar
          q={q}
          onQChange={setQ}
          qPlaceholder="Search city, route, vehicle, or driver..."
          sort={sort}
          onSortChange={setSort}
          sortOptions={[
            { value: "createdAt:desc", label: "Newest first" },
            { value: "createdAt:asc", label: "Oldest first" },
            { value: "status:asc", label: "Status" }
          ]}
        />
      </Panel>

      <div className="filter-tabs">
        {["", "DRAFT", "DISPATCHED", "COMPLETED", "CANCELLED"].map((s) => (
          <motion.button
            key={s || "all"}
            className={`filter-tab ${filter === s ? "active" : ""}`}
            onClick={() => setFilter(s)}
            whileTap={{ scale: 0.96 }}
          >
            {s ? s.replace(/_/g, " ") : "All trips"}
          </motion.button>
        ))}
      </div>

      {isLoading ? (
        <div className="trip-cards-grid">{[1, 2, 3].map((i) => <div key={i} className="skeleton skeleton-trip" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState title="No trips found" description="Try another search, clear filters, or create a new draft." />
      ) : (
        <motion.div className="trip-cards-grid" variants={staggerContainer} initial="initial" animate="animate">
          {items.map((t, i) => (
            <motion.div key={t.id} variants={staggerItem}>
              <TripCard
                trip={t}
                index={i}
                actions={
                  canEdit && (
                    <>
                      {t.status === "DRAFT" && (
                        <>
                          <button className="btn-primary-sm" onClick={() => dispatch.mutate(t.id)}>
                            Dispatch
                          </button>
                          <button className="btn-ghost-sm" onClick={() => cancel.mutate(t.id)}>
                            Cancel
                          </button>
                        </>
                      )}
                      {t.status === "DISPATCHED" && (
                        <>
                          <button className="btn-primary-sm" onClick={() => openMapsEditor(t)}>
                            <MapPin size={14} /> Maps
                          </button>
                          <button
                            className="btn-primary-sm"
                            onClick={() => {
                              setCompleteTrip(t);
                              setCompleteForm({
                                finalOdometer: String(t.vehicle?.odometer ?? "0"),
                                fuelConsumed: "5"
                              });
                            }}
                          >
                            Complete
                          </button>
                          <button className="btn-ghost-sm" onClick={() => cancel.mutate(t.id)}>
                            Cancel
                          </button>
                        </>
                      )}
                      {(t.status === "DISPATCHED" || t.status === "COMPLETED") && (
                        <a
                          className="btn-ghost-sm"
                          href={googleDirectionsUrl(t.source, t.destination)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink size={14} /> Route
                        </a>
                      )}
                    </>
                  )
                }
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      <Modal open={showCreate} title="Create trip draft" onClose={() => setShowCreate(false)}>
        <div className="form-grid">
          <label className="field">
            <span>Pickup (India)</span>
            <input
              list="india-cities"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              placeholder="e.g. Andheri West Depot, Mumbai"
            />
          </label>
          <label className="field">
            <span>Drop-off (India)</span>
            <input
              list="india-cities"
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
              placeholder="e.g. Electronic City, Bengaluru"
            />
          </label>
          <datalist id="india-cities">
            {INDIA_CITIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <label className="field">
            <span>
              Vehicle
              <select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
                <option value="">Select vehicle</option>
                {options?.vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNumber} · {v.maximumLoadCapacity} kg
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label className="field">
            <span>
              Driver
              <select value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })}>
                <option value="">Select driver</option>
                {options?.drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label className="field">
            <span>Cargo (kg)</span>
            <input value={form.cargoWeight} onChange={(e) => setForm({ ...form, cargoWeight: e.target.value })} />
          </label>
          <label className="field">
            <span>Distance (km)</span>
            <input value={form.plannedDistance} onChange={(e) => setForm({ ...form, plannedDistance: e.target.value })} />
          </label>
          <label className="field">
            <span>Revenue (₹)</span>
            <input value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} />
          </label>
        </div>
        <button className="btn-primary btn-full" onClick={() => create.mutate()} disabled={!form.vehicleId || !form.driverId}>
          Create draft
        </button>
      </Modal>

      <Modal open={!!mapsTrip} title="Google Maps tracking" onClose={() => setMapsTrip(null)}>
        <p className="muted mb">
          Enter start &amp; end locations in India, then paste the driver&apos;s Google Maps live location share link.
          On Android/iPhone: open Google Maps → Location → Share live location → copy link.
        </p>
        <div className="form-grid">
          <label className="field">
            <span>Start location</span>
            <input
              list="india-cities-maps"
              value={mapsForm.source}
              onChange={(e) => setMapsForm({ ...mapsForm, source: e.target.value })}
              placeholder="Pickup address / city"
            />
          </label>
          <label className="field">
            <span>End location</span>
            <input
              list="india-cities-maps"
              value={mapsForm.destination}
              onChange={(e) => setMapsForm({ ...mapsForm, destination: e.target.value })}
              placeholder="Drop address / city"
            />
          </label>
          <datalist id="india-cities-maps">
            {INDIA_CITIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            <span>Driver live location link (Google Maps)</span>
            <input
              value={mapsForm.liveLocationUrl}
              onChange={(e) => setMapsForm({ ...mapsForm, liveLocationUrl: e.target.value })}
              placeholder="https://maps.app.goo.gl/... or https://www.google.com/maps/..."
            />
          </label>
        </div>
        {mapsForm.source && mapsForm.destination && (
          <div className="mb">
            <GoogleRouteMap origin={mapsForm.source} destination={mapsForm.destination} height={240} />
          </div>
        )}
        <button
          className="btn-primary btn-full"
          onClick={() => saveTracking.mutate()}
          disabled={!mapsForm.source.trim() || !mapsForm.destination.trim() || saveTracking.isPending}
        >
          {saveTracking.isPending ? "Saving…" : "Save maps tracking"}
        </button>
      </Modal>

      <Modal open={!!completeTrip} title="Complete trip" onClose={() => setCompleteTrip(null)}>
        <p className="muted mb">Record final odometer (km) and fuel (litres) for this run.</p>
        <div className="form-grid">
          <label className="field">
            <span>Final odometer (km)</span>
            <input
              value={completeForm.finalOdometer}
              onChange={(e) => setCompleteForm({ ...completeForm, finalOdometer: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Fuel consumed (L)</span>
            <input
              value={completeForm.fuelConsumed}
              onChange={(e) => setCompleteForm({ ...completeForm, fuelConsumed: e.target.value })}
            />
          </label>
        </div>
        <button className="btn-primary btn-full" onClick={() => complete.mutate()}>
          Mark completed
        </button>
      </Modal>
    </>
  );
}
