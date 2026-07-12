import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Activity, Car, Clock, MapPin, TrendingUp, Users, Wrench, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import type { DashboardData, Paginated, Trip } from "../lib/types";
import { liveQueryDefaults } from "../lib/live";
import { FleetStatusBar } from "../components/TripCard";
import { DispatchTrackingBoard } from "../components/DispatchTrackingBoard";
import { TripMapsPanel } from "../components/GoogleMaps";
import { FleetGauge, KpiCard, PageHeader, Panel } from "../components/ui";
import { SkeletonGrid, staggerContainer, staggerItem } from "../components/motion";

export function DashboardPage() {
  const [filters, setFilters] = useState({ type: "", status: "", region: "" });

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["dashboard", filters],
    queryFn: async () => (await api.get<DashboardData>("/dashboard", { params: filters })).data,
    ...liveQueryDefaults
  });

  const { data: trips } = useQuery({
    queryKey: ["trips-live"],
    queryFn: async () =>
      (await api.get<Paginated<Trip>>("/trips", { params: { limit: 50, status: "DISPATCHED" } })).data,
    ...liveQueryDefaults
  });

  const onTripCount = (data?.activeVehicles ?? 0) - (data?.availableVehicles ?? 0) - (data?.inShopVehicles ?? 0);

  return (
    <>
      <PageHeader
        title="Fleet Command Center"
        subtitle={`Real-time logistics overview · Updated ${new Date(dataUpdatedAt).toLocaleTimeString()}`}
        actions={
          <Link to="/trips" className="btn-primary">
            <Zap size={16} /> New dispatch
          </Link>
        }
      />

      <div className="filter-bar glass-filter">
        {[
          { key: "type", options: [["", "All types"], ["VAN", "Van"], ["TRUCK", "Truck"], ["BIKE", "Bike"]] },
          { key: "status", options: [["", "All statuses"], ["AVAILABLE", "Available"], ["ON_TRIP", "On Trip"], ["IN_SHOP", "In Shop"]] }
        ].map((f) => (
          <select
            key={f.key}
            value={filters[f.key as keyof typeof filters]}
            onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })}
          >
            {f.options.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        ))}
        <input
          placeholder="Region filter…"
          value={filters.region}
          onChange={(e) => setFilters({ ...filters, region: e.target.value })}
        />
      </div>

      {isLoading ? (
        <SkeletonGrid />
      ) : (
        <motion.div className="kpi-grid" variants={staggerContainer} initial="initial" animate="animate">
          {[
            { label: "Active Fleet", value: data?.activeVehicles ?? 0, icon: <Car size={20} /> },
            { label: "Available", value: data?.availableVehicles ?? 0, icon: <Activity size={20} /> },
            { label: "In Maintenance", value: data?.inShopVehicles ?? 0, icon: <Wrench size={20} /> },
            { label: "Live Trips", value: data?.activeTrips ?? 0, icon: <MapPin size={20} /> },
            { label: "Pending", value: data?.pendingTrips ?? 0, icon: <Clock size={20} /> },
            { label: "Drivers On Duty", value: data?.driversOnDuty ?? 0, icon: <Users size={20} /> }
          ].map((k, i) => (
            <motion.div key={k.label} variants={staggerItem}>
              <KpiCard {...k} delay={i * 0.05} />
            </motion.div>
          ))}
        </motion.div>
      )}

      <Panel className="map-hero" delay={0.05}>
        <div className="panel-head">
          <h3><MapPin size={16} /> Google Maps — active dispatches</h3>
          <span className="muted">Routes across India · driver live location links</span>
        </div>
        <TripMapsPanel trips={trips?.items ?? []} />
      </Panel>

      <div className="command-grid">
        <Panel className="command-main" delay={0.1}>
          <div className="panel-head">
            <h3><TrendingUp size={16} /> Utilization trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data?.utilizationTrend ?? []}>
              <defs>
                <linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="label" stroke="#737373" tickLine={false} axisLine={false} />
              <YAxis stroke="#737373" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 8, color: "#fff" }} />
              <Area type="monotone" dataKey="value" stroke="#ffffff" fill="url(#utilGrad)" strokeWidth={2} animationDuration={1200} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel className="command-side" delay={0.15}>
          <FleetGauge value={data?.fleetUtilization ?? 0} />
          <div className="fleet-bar-wrap">
            <p className="panel-sub">Fleet status distribution</p>
            <FleetStatusBar
              available={data?.availableVehicles ?? 0}
              onTrip={Math.max(0, onTripCount)}
              inShop={data?.inShopVehicles ?? 0}
              total={data?.activeVehicles ?? 1}
            />
            <div className="fleet-legend">
              <span>Available</span>
              <span>On trip</span>
              <span>In shop</span>
            </div>
          </div>
        </Panel>

        <Panel className="command-live" delay={0.2}>
          <div className="panel-head">
            <h3><Zap size={16} /> Live dispatches</h3>
            <Link to="/trips" className="link-sm">View all</Link>
          </div>
          <DispatchTrackingBoard trips={trips?.items ?? []} />
        </Panel>

        <Panel className="command-cost" delay={0.25}>
          <div className="panel-head">
            <h3>Operational costs</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data?.costBreakdown ?? []}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="label" stroke="#737373" tickLine={false} axisLine={false} />
              <YAxis stroke="#737373" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 8, color: "#fff" }} />
              <Bar dataKey="value" fill="#ffffff" radius={[6, 6, 0, 0]} animationDuration={1000} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </>
  );
}
