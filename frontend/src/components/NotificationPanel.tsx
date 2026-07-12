import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bell, CheckCircle2, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../lib/api";
import { liveQueryDefaults } from "../lib/live";

export type NotificationItem = {
  id: string;
  kind: "action" | "info" | "warning";
  title: string;
  message: string;
  link: string;
  createdAt: string;
};

const kindIcon = {
  action: AlertTriangle,
  warning: AlertTriangle,
  info: Info
};

const kindClass = {
  action: "notif-action",
  warning: "notif-warning",
  info: "notif-info"
};

function formatWhen(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: items = [], isFetching } = useQuery({
    queryKey: ["notifications-feed"],
    queryFn: async () => (await api.get<NotificationItem[]>("/notifications/feed")).data,
    ...liveQueryDefaults,
    enabled: open
  });

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);

  const actionCount = items.filter((i) => i.kind === "action" || i.kind === "warning").length;

  return (
    <div className="notif-wrap" ref={panelRef}>
      <AnimatePresence>
        {open && (
          <motion.div
            className="notif-panel glass-panel"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <div className="notif-head">
              <strong>
                <Bell size={14} /> Notifications
              </strong>
              <span className="muted">{isFetching ? "Updating…" : `${items.length} item(s)`}</span>
            </div>
            <div className="notif-list">
              {items.length === 0 ? (
                <div className="notif-empty">
                  <CheckCircle2 size={28} />
                  <p>All clear — nothing needs attention right now.</p>
                </div>
              ) : (
                items.map((item) => {
                  const Icon = kindIcon[item.kind];
                  return (
                    <Link
                      key={item.id}
                      to={item.link}
                      className={`notif-item ${kindClass[item.kind]}`}
                      onClick={onClose}
                    >
                      <Icon size={16} />
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.message}</p>
                        <span className="notif-time">{formatWhen(item.createdAt)}</span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
            {actionCount > 0 && (
              <div className="notif-foot muted">{actionCount} item(s) need your attention</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function useNotificationCount() {
  const { data: items = [] } = useQuery({
    queryKey: ["notifications-feed"],
    queryFn: async () => (await api.get<NotificationItem[]>("/notifications/feed")).data,
    ...liveQueryDefaults
  });
  return items.filter((i) => i.kind === "action" || i.kind === "warning").length;
}
