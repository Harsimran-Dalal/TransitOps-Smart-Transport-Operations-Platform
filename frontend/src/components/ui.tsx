import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

const badgeMap: Record<string, string> = {
  AVAILABLE: "badge-gray",
  ON_TRIP: "badge-gray",
  IN_SHOP: "badge-gray",
  RETIRED: "badge-gray",
  OFF_DUTY: "badge-gray",
  SUSPENDED: "badge-gray",
  DRAFT: "badge-gray",
  DISPATCHED: "badge-gray",
  COMPLETED: "badge-gray",
  CANCELLED: "badge-gray"
};

export function AnimatedNumber({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame: number;
    const from = display;
    const to = value;
    const start = performance.now();
    const duration = 900;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(from + (to - from) * eased);
      if (t < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span className="animated-number">
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <motion.span
      className={`badge ${badgeMap[status] ?? "badge-gray"}`}
      layout
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
    >
      <span className="badge-dot" />
      {status.replace(/_/g, " ")}
    </motion.span>
  );
}

export function KpiCard({
  label,
  value,
  suffix = "",
  icon,
  delay = 0
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      className="kpi-card"
      initial={{ opacity: 0, y: 28, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.2 } }}
    >
      <div className="kpi-glow" />
      <div className="kpi-icon">{icon}</div>
      <div>
        <p className="kpi-label">{label}</p>
        <p className="kpi-value">
          <AnimatedNumber value={value} suffix={suffix} />
        </p>
      </div>
    </motion.div>
  );
}

export function FleetGauge({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const circumference = 2 * Math.PI * 58;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="fleet-gauge">
      <svg viewBox="0 0 140 140" className="gauge-svg">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#a3a3a3" />
          </linearGradient>
        </defs>
        <circle cx="70" cy="70" r="58" className="gauge-track" />
        <motion.circle
          cx="70"
          cy="70"
          r="58"
          className="gauge-fill"
          stroke="url(#gaugeGrad)"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="gauge-center">
        <AnimatedNumber value={pct} decimals={1} suffix="%" />
        <span className="gauge-label">Fleet Utilization</span>
      </div>
    </div>
  );
}

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <div className="modal-header">
              <h3>{title}</h3>
              <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
                ×
              </button>
            </div>
            <div className="modal-body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <motion.header
      className="page-header"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </motion.header>
  );
}

export function Panel({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.section
      className={`glass-panel ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="empty-icon">◌</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </motion.div>
  );
}
