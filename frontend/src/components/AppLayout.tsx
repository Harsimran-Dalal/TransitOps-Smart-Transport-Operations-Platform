import { Link, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Truck,
  Users,
  Route,
  Wrench,
  Fuel,
  BarChart3,
  LogOut,
  Moon,
  Sun,
  Radio,
  Bell,
  Sparkles,
  Settings as SettingsIcon
} from "lucide-react";
import { motion } from "framer-motion";
import type { SessionUser } from "../lib/types";
import { canRead, canWrite, roleLabel } from "../lib/permissions";
import type { Role } from "@transitops/shared";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LIVE_REFETCH_MS } from "../lib/live";
import { NotificationPanel, useNotificationCount } from "./NotificationPanel";
import { FleetCopilot } from "./FleetCopilot";

const navItems = [
  { path: "/dashboard", label: "Command Center", icon: LayoutDashboard, section: "dashboard" },
  { path: "/vehicles", label: "Fleet Registry", icon: Truck, section: "vehicles" },
  { path: "/drivers", label: "Drivers", icon: Users, section: "drivers" },
  { path: "/trips", label: "Live Trips", icon: Route, section: "trips" },
  { path: "/maintenance", label: "Maintenance", icon: Wrench, section: "maintenance" },
  { path: "/fuel-expenses", label: "Fuel & Costs", icon: Fuel, section: "fuel" },
  { path: "/reports", label: "Analytics", icon: BarChart3, section: "reports" },
  { path: "/settings", label: "Settings", icon: SettingsIcon, section: "settings" }
];

export function AppLayout({
  user,
  onLogout,
  theme,
  onToggleTheme,
  children
}: {
  user: SessionUser;
  onLogout: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [notifOpen, setNotifOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const notifCount = useNotificationCount();
  const role = user.role as Role;
  const visibleNav = navItems.filter((item) => canRead(role, item.section));
  const isFetching = queryClient.isFetching() > 0;

  return (
    <div className="app-shell">
      <div className="mesh-bg mesh-bg-static" aria-hidden />

      <aside className="sidebar glass-sidebar">
        <div className="sidebar-brand">
          <motion.div
            className="brand-mark"
            whileHover={{ scale: 1.08, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Truck size={20} />
          </motion.div>
          <div>
            <strong>TransitOps</strong>
            <span>Logistics Command</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {visibleNav.map((item, i) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <NavLink
                  to={item.path}
                  className={() => `nav-link ${active ? "active" : ""}`}
                >
                  {active && (
                    <motion.span
                      className="nav-active-bg"
                      layoutId="sidebar-active"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                  <span>{item.label}</span>
                </NavLink>
              </motion.div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <motion.div className="avatar" whileHover={{ scale: 1.05 }}>
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="avatar-img" />
              ) : (
                user.name?.[0]?.toUpperCase() ?? user.email[0]?.toUpperCase()
              )}
            </motion.div>
            <div>
              <strong>{user.name ?? user.email.split("@")[0]}</strong>
              <span>{roleLabel(role)}</span>
            </div>
          </div>
          <div className="sidebar-actions">
            <button type="button" className="btn-icon" onClick={onToggleTheme} title="Toggle theme">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button type="button" className="btn-icon" onClick={onLogout} title="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="glass-topbar">
          <div className="topbar-left">
            <h2 className="topbar-title">{visibleNav.find((n) => n.path === location.pathname)?.label ?? "TransitOps"}</h2>
            <span className="topbar-sync">
              <Radio size={12} className={isFetching ? "spin" : ""} />
              Live · sync every {LIVE_REFETCH_MS / 1000}s
            </span>
          </div>
          <div className="topbar-right">
            {canWrite(role, "trips") && (
              <Link to="/trips" className="btn-primary btn-sm topbar-cta">
                + Dispatch trip
              </Link>
            )}
            <div className={`live-pill ${isFetching ? "fetching" : ""}`} title="Fleet sync status">
              <span className="pulse" />
              {isFetching ? "Updating…" : "Fleet online"}
            </div>
            <button
              type="button"
              className="btn-copilot"
              onClick={() => setCopilotOpen(true)}
              title="Fleet Copilot — AI search"
            >
              <Sparkles size={16} />
              <span>Ask fleet</span>
            </button>
            <div className="notif-trigger-wrap">
              <button
                type="button"
                className={`btn-icon notif-btn ${notifOpen ? "active" : ""}`}
                aria-label="Notifications"
                aria-expanded={notifOpen}
                onClick={() => setNotifOpen((v) => !v)}
              >
                <Bell size={18} />
                {notifCount > 0 && <span className="notif-badge">{notifCount > 9 ? "9+" : notifCount}</span>}
              </button>
              <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
            </div>
            <div className="role-badge" title={user.email}>
              <span className="role-badge-dot" />
              {roleLabel(role)}
            </div>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
      <FleetCopilot open={copilotOpen} onClose={() => setCopilotOpen(false)} />
    </div>
  );
}
