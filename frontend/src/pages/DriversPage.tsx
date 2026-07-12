import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Pencil, Plus } from "lucide-react";
import type { Role } from "@transitops/shared";
import { api } from "../lib/api";
import type { Driver, Paginated, SessionUser } from "../lib/types";
import { canWrite } from "../lib/permissions";
import { ListToolbar } from "../components/ListToolbar";
import { Modal, PageHeader, Panel, StatusBadge } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { liveQueryDefaults } from "../lib/live";

function isExpiringSoon(date: string) {
  const days = (new Date(date).getTime() - Date.now()) / 86400000;
  return days <= 30;
}

const sortOptions = [
  { value: "name:asc", label: "Name A–Z" },
  { value: "name:desc", label: "Name Z–A" },
  { value: "safetyScore:desc", label: "Safety score high–low" },
  { value: "status:asc", label: "Status" },
  { value: "createdAt:desc", label: "Newest first" }
];

const defaultForm = {
  name: "",
  licenseNumber: "",
  licenseCategory: "B",
  licenseExpiryDate: new Date(Date.now() + 86400000 * 365).toISOString().slice(0, 10),
  contactNumber: "+91-9876543210",
  email: "",
  safetyScore: 90,
  status: "AVAILABLE" as const
};

export function DriversPage({ user }: { user: SessionUser }) {
  const qc = useQueryClient();
  const toast = useToast();
  const role = user.role as Role;
  const canEdit = canWrite(role, "drivers");
  const canCreate = role === "FLEET_MANAGER";

  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("name:asc");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [form, setForm] = useState(defaultForm);

  const queryParams = useMemo(
    () => ({ q: deferredQ || undefined, status: status || undefined, sort, limit: 50 }),
    [deferredQ, status, sort]
  );

  const { data } = useQuery({
    queryKey: ["drivers", queryParams],
    queryFn: async () => (await api.get<Paginated<Driver>>("/drivers", { params: queryParams })).data,
    ...liveQueryDefaults
  });

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setShowForm(true);
  };

  const openEdit = (driver: Driver) => {
    setEditing(driver);
    setForm({
      name: driver.name,
      licenseNumber: driver.licenseNumber,
      licenseCategory: driver.licenseCategory,
      licenseExpiryDate: driver.licenseExpiryDate.slice(0, 10),
      contactNumber: driver.contactNumber,
      email: driver.email ?? "",
      safetyScore: Number(driver.safetyScore),
      status: driver.status as typeof defaultForm.status
    });
    setShowForm(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, email: form.email || undefined };
      if (editing) return (await api.put(`/drivers/${editing.id}`, payload)).data;
      return (await api.post("/drivers", payload)).data;
    },
    onSuccess: async () => {
      setShowForm(false);
      setEditing(null);
      toast(editing ? "Driver updated" : "Driver registered", "success");
      await qc.invalidateQueries({ queryKey: ["drivers"] });
    },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast(err.response?.data?.error ?? "Failed to save driver", "error")
  });

  const suspend = useMutation({
    mutationFn: async (id: string) => (await api.post(`/drivers/${id}/suspend`)).data,
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["drivers"] })
  });

  const unsuspend = useMutation({
    mutationFn: async (id: string) => (await api.post(`/drivers/${id}/unsuspend`)).data,
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["drivers"] })
  });

  return (
    <>
      <PageHeader
        title="Driver Management"
        subtitle="Profiles, license compliance, safety scores, and email reminders"
        actions={canCreate && (
          <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Add driver</button>
        )}
      />

      <Panel>
        <ListToolbar
          q={q}
          onQChange={setQ}
          qPlaceholder="Search name or license..."
          sort={sort}
          onSortChange={setSort}
          sortOptions={sortOptions}
          filters={
            <label className="filter-control">
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All</option>
                <option value="AVAILABLE">Available</option>
                <option value="ON_TRIP">On Trip</option>
                <option value="OFF_DUTY">Off Duty</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </label>
          }
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>License</th><th>Email</th><th>Expiry</th><th>Score</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {data?.items.map((driver) => (
                <tr key={driver.id}>
                  <td><strong>{driver.name}</strong></td>
                  <td>{driver.licenseNumber}</td>
                  <td className="muted">{driver.email ?? "—"}</td>
                  <td className={isExpiringSoon(driver.licenseExpiryDate) ? "warn-cell" : ""}>
                    {isExpiringSoon(driver.licenseExpiryDate) && <AlertTriangle size={14} />}
                    {new Date(driver.licenseExpiryDate).toLocaleDateString()}
                  </td>
                  <td>{driver.safetyScore}</td>
                  <td><StatusBadge status={driver.status} /></td>
                  <td className="actions-cell">
                    {canEdit && (
                      <button className="btn-ghost-sm" onClick={() => openEdit(driver)}>
                        <Pencil size={14} /> Edit
                      </button>
                    )}
                    {canEdit && driver.status !== "SUSPENDED" && driver.status !== "ON_TRIP" && (
                      <button className="btn-ghost-sm" onClick={() => suspend.mutate(driver.id)}>Suspend</button>
                    )}
                    {canEdit && driver.status === "SUSPENDED" && (
                      <button className="btn-ghost-sm" onClick={() => unsuspend.mutate(driver.id)}>Unsuspend</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Modal open={showForm} title={editing ? "Edit driver" : "Register driver"} onClose={() => { setShowForm(false); setEditing(null); }}>
        <div className="form-grid">
          <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>License<input value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} /></label>
          <label>Category<input value={form.licenseCategory} onChange={(e) => setForm({ ...form, licenseCategory: e.target.value })} /></label>
          <label>Expiry<input type="date" value={form.licenseExpiryDate} onChange={(e) => setForm({ ...form, licenseExpiryDate: e.target.value })} /></label>
          <label>Contact<input value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} /></label>
          <label>Email (for license reminders)<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="driver@company.com" /></label>
          <label>Safety score<input type="number" min={0} max={100} value={form.safetyScore} onChange={(e) => setForm({ ...form, safetyScore: Number(e.target.value) })} /></label>
          <label>Status
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}>
              <option value="AVAILABLE">Available</option>
              <option value="ON_TRIP">On Trip</option>
              <option value="OFF_DUTY">Off Duty</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </label>
        </div>
        <button className="btn-primary btn-full" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : editing ? "Update driver" : "Save driver"}
        </button>
      </Modal>
    </>
  );
}
