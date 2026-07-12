import { useDeferredValue, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import type { Role, VehicleType } from "@transitops/shared";
import { VEHICLE_TYPE_OPTIONS, inferVehicleTypeFromModel } from "@transitops/shared";
import { api } from "../lib/api";
import type { Paginated, SessionUser, Vehicle } from "../lib/types";
import { canWrite } from "../lib/permissions";
import { ListToolbar } from "../components/ListToolbar";
import { VehicleTypeIcon } from "../components/VehicleTypeIcon";
import { Modal, PageHeader, Panel, StatusBadge } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { liveQueryDefaults } from "../lib/live";
import { INDIA_REGIONS } from "../lib/india";

type VehicleDocument = {
  id: string;
  vehicleId: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
};

const defaultForm = {
  registrationNumber: "",
  nameModel: "",
  type: "VAN" as VehicleType,
  maximumLoadCapacity: "500",
  odometer: "0",
  acquisitionCost: "25000",
  region: "Mumbai Metro",
  status: "AVAILABLE" as const
};

const sortOptions = [
  { value: "registrationNumber:asc", label: "Registration A–Z" },
  { value: "registrationNumber:desc", label: "Registration Z–A" },
  { value: "status:asc", label: "Status" },
  { value: "region:asc", label: "Region" },
  { value: "createdAt:desc", label: "Newest first" }
];

export function VehiclesPage({ user }: { user: SessionUser }) {
  const qc = useQueryClient();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canEdit = canWrite(user.role as Role, "vehicles");

  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [region, setRegion] = useState("");
  const [sort, setSort] = useState("registrationNumber:asc");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [docVehicle, setDocVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState(defaultForm);

  const queryParams = useMemo(
    () => ({
      q: deferredQ || undefined,
      type: type || undefined,
      status: status || undefined,
      region: region || undefined,
      sort,
      limit: 50
    }),
    [deferredQ, type, status, region, sort]
  );

  const { data } = useQuery({
    queryKey: ["vehicles", queryParams],
    queryFn: async () => (await api.get<Paginated<Vehicle>>("/vehicles", { params: queryParams })).data,
    ...liveQueryDefaults
  });

  const { data: documents, refetch: refetchDocs } = useQuery({
    queryKey: ["vehicle-documents", docVehicle?.id],
    queryFn: async () =>
      (await api.get<VehicleDocument[]>(`/vehicles/${docVehicle!.id}/documents`)).data,
    enabled: !!docVehicle
  });

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setShowForm(true);
  };

  const openEdit = (vehicle: Vehicle) => {
    setEditing(vehicle);
    setForm({
      registrationNumber: vehicle.registrationNumber,
      nameModel: vehicle.nameModel,
      type: vehicle.type as VehicleType,
      maximumLoadCapacity: String(vehicle.maximumLoadCapacity),
      odometer: String(vehicle.odometer),
      acquisitionCost: String(vehicle.acquisitionCost),
      region: vehicle.region,
      status: vehicle.status as typeof defaultForm.status
    });
    setShowForm(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        return (await api.put(`/vehicles/${editing.id}`, form)).data;
      }
      return (await api.post("/vehicles", form)).data;
    },
    onSuccess: async () => {
      setShowForm(false);
      setEditing(null);
      setForm(defaultForm);
      toast(editing ? "Vehicle updated" : "Vehicle registered", "success");
      await qc.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast(err.response?.data?.error ?? "Failed to save vehicle", "error")
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/vehicles/${id}`),
    onSuccess: async () => {
      toast("Vehicle removed", "success");
      await qc.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast(err.response?.data?.error ?? "Failed to delete vehicle", "error")
  });

  const uploadDoc = useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData();
      body.append("file", file);
      return (
        await api.post(`/vehicles/${docVehicle!.id}/documents`, body, {
          headers: { "Content-Type": "multipart/form-data" }
        })
      ).data;
    },
    onSuccess: async () => {
      toast("Document uploaded", "success");
      await refetchDocs();
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast(err.response?.data?.error ?? "Upload failed", "error")
  });

  const deleteDoc = useMutation({
    mutationFn: async (id: string) => api.delete(`/documents/${id}`),
    onSuccess: async () => {
      toast("Document deleted", "success");
      await refetchDocs();
    }
  });

  const downloadDoc = async (doc: VehicleDocument) => {
    const response = await api.get(`/documents/${doc.id}/download`, { responseType: "blob" });
    const url = window.URL.createObjectURL(response.data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = doc.fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Vehicle Registry"
        subtitle="Master fleet list with registration, capacity, status, and compliance documents"
        actions={
          canEdit && (
            <button className="btn-primary" onClick={openCreate}>
              <Plus size={16} /> Add vehicle
            </button>
          )
        }
      />

      <Panel>
        <ListToolbar
          q={q}
          onQChange={setQ}
          qPlaceholder="Search registration, model, region..."
          sort={sort}
          onSortChange={setSort}
          sortOptions={sortOptions}
          filters={
            <>
              <label className="filter-control">
                Type
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="">All</option>
                  {VEHICLE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
              <label className="filter-control">
                Status
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">All</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="ON_TRIP">On Trip</option>
                  <option value="IN_SHOP">In Shop</option>
                  <option value="RETIRED">Retired</option>
                </select>
              </label>
              <label className="filter-control">
                Region
                <select value={region} onChange={(e) => setRegion(e.target.value)}>
                  <option value="">All regions</option>
                  {INDIA_REGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>
            </>
          }
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Registration</th>
                <th>Model</th>
                <th>Type</th>
                <th>Capacity (kg)</th>
                <th>Region</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td><strong>{vehicle.registrationNumber}</strong></td>
                  <td>{vehicle.nameModel}</td>
                  <td><VehicleTypeIcon type={vehicle.type} showLabel /></td>
                  <td>{vehicle.maximumLoadCapacity}</td>
                  <td>{vehicle.region}</td>
                  <td><StatusBadge status={vehicle.status} /></td>
                  <td className="actions-cell">
                    <button className="btn-ghost-sm" onClick={() => setDocVehicle(vehicle)}>
                      <FileText size={14} /> Docs
                    </button>
                    {canEdit && (
                      <>
                        <button className="btn-ghost-sm" onClick={() => openEdit(vehicle)}>
                          <Pencil size={14} /> Edit
                        </button>
                        <button className="btn-danger-sm" onClick={() => remove.mutate(vehicle.id)}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Modal
        open={showForm}
        title={editing ? "Edit vehicle" : "Register vehicle"}
        onClose={() => {
          setShowForm(false);
          setEditing(null);
        }}
      >
        <div className="form-grid">
          <label>Registration<input value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} /></label>
          <label>Model
            <input
              value={form.nameModel}
              onChange={(e) => {
                const nameModel = e.target.value;
                const inferred = !editing ? inferVehicleTypeFromModel(nameModel) : null;
                setForm({
                  ...form,
                  nameModel,
                  ...(inferred ? { type: inferred } : {})
                });
              }}
            />
          </label>
          <label>Type
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as VehicleType })}>
              {VEHICLE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <label>Status
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}>
              <option value="AVAILABLE">Available</option>
              <option value="ON_TRIP">On Trip</option>
              <option value="IN_SHOP">In Shop</option>
              <option value="RETIRED">Retired</option>
            </select>
          </label>
          <label>Max capacity (kg)<input value={form.maximumLoadCapacity} onChange={(e) => setForm({ ...form, maximumLoadCapacity: e.target.value })} /></label>
          <label>Odometer<input value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} /></label>
          <label>Acquisition cost<input value={form.acquisitionCost} onChange={(e) => setForm({ ...form, acquisitionCost: e.target.value })} /></label>
          <label>Region<input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></label>
        </div>
        <button className="btn-primary btn-full" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : editing ? "Update vehicle" : "Save vehicle"}
        </button>
      </Modal>

      <Modal open={!!docVehicle} title={`Documents — ${docVehicle?.registrationNumber ?? ""}`} onClose={() => setDocVehicle(null)}>
        {canEdit && (
          <div className="doc-upload-row">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadDoc.mutate(file);
              }}
            />
            <p className="muted">Upload registration, insurance, inspection certificates (max 5 MB).</p>
          </div>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>File</th><th>Uploaded</th><th></th></tr>
            </thead>
            <tbody>
              {(documents ?? []).map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.fileName}</td>
                  <td className="muted">{new Date(doc.uploadedAt).toLocaleString()}</td>
                  <td className="actions-cell">
                    <button className="btn-ghost-sm" onClick={() => downloadDoc(doc)}>Download</button>
                    {canEdit && (
                      <button className="btn-danger-sm" onClick={() => deleteDoc.mutate(doc.id)}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
              {(documents ?? []).length === 0 && (
                <tr><td colSpan={3} className="muted">No documents uploaded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Modal>
    </>
  );
}
