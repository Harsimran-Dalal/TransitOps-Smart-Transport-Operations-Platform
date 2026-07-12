import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import type { Role } from "@transitops/shared";
import { api } from "../lib/api";
import type { MaintenanceLog, Paginated, SessionUser, Vehicle } from "../lib/types";
import { canWrite } from "../lib/permissions";
import { Modal, PageHeader, Panel, StatusBadge } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { liveQueryDefaults } from "../lib/live";

export function MaintenancePage({ user }: { user: SessionUser }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const toast = useToast();
  const canEdit = canWrite(user.role as Role, "maintenance");
  const [form, setForm] = useState({ vehicleId: "", description: "Oil Change", cost: "120" });

  const { data: logs, isLoading } = useQuery({
    queryKey: ["maintenance"],
    queryFn: async () => (await api.get<Paginated<MaintenanceLog>>("/maintenance")).data,
    ...liveQueryDefaults
  });

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles-list"],
    queryFn: async () => (await api.get<Paginated<Vehicle>>("/vehicles", { params: { limit: 100 } })).data
  });

  const create = useMutation({
    mutationFn: async () => (await api.post("/maintenance", form)).data,
    onSuccess: async () => { setShowForm(false); toast("Maintenance log opened", "success"); await qc.invalidateQueries(); },
    onError: (err: any) => toast(err.response?.data?.error ?? "Failed to create maintenance log", "error")
  });

  const close = useMutation({
    mutationFn: async (id: string) => (await api.post(`/maintenance/${id}/close`)).data,
    onSuccess: async () => { toast("Maintenance closed", "success"); await qc.invalidateQueries(); }
  });

  return (
    <>
      <PageHeader
        title="Maintenance"
        subtitle="Service logs — opening a record sets vehicle to In Shop"
        actions={canEdit && (
          <button className="btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> New log</button>
        )}
      />

      <Panel>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Vehicle</th><th>Description</th><th>Cost</th><th>Opened</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {logs?.items.map((log) => (
                <tr key={log.id}>
                  <td>{log.vehicle?.registrationNumber ?? log.vehicleId.slice(0, 8)}</td>
                  <td>{log.description}</td>
                  <td>${Number(log.cost).toFixed(2)}</td>
                  <td>{new Date(log.openedAt).toLocaleDateString()}</td>
                  <td><StatusBadge status={log.isOpen ? "IN_SHOP" : "AVAILABLE"} /></td>
                  <td>
                    {canEdit && log.isOpen && (
                      <button className="btn-primary-sm" onClick={() => close.mutate(log.id)}>Close</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Modal open={showForm} title="Create maintenance log" onClose={() => setShowForm(false)}>
        <div className="form-grid">
          <label>Vehicle
            <select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
              <option value="">Select vehicle</option>
              {vehicles?.items.filter((v) => v.status !== "RETIRED" && v.status !== "ON_TRIP").map((v) => (
                <option key={v.id} value={v.id}>{v.registrationNumber} — {v.status}</option>
              ))}
            </select>
          </label>
          <label>Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label>Cost<input value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></label>
        </div>
        <button className="btn-primary" onClick={() => create.mutate()} disabled={!form.vehicleId}>Open maintenance</button>
      </Modal>
    </>
  );
}
