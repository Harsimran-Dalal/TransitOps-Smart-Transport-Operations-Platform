import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import type { Role } from "@transitops/shared";
import { api } from "../lib/api";
import type { Paginated, SessionUser, Vehicle } from "../lib/types";
import { canWrite } from "../lib/permissions";
import { Modal, PageHeader, Panel } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { liveQueryDefaults } from "../lib/live";

type FuelLog = { id: string; vehicleId: string; liters: string; cost: string; recordedAt: string; vehicle?: Vehicle };
type Expense = { id: string; vehicleId: string; type: string; amount: string; recordedAt: string; vehicle?: Vehicle };

function normalizeDecimal(value: string) {
  return value.trim().replace(/^\$/, "").replace(/,/g, "");
}

function apiErrorMessage(err: unknown, fallback: string) {
  const data = (err as { response?: { data?: { error?: string; details?: Record<string, string[] | undefined> } } })
    ?.response?.data;
  if (!data) return fallback;
  const detail = data.details
    ? Object.entries(data.details)
        .flatMap(([field, messages]) => (messages ?? []).map((message) => `${field}: ${message}`))
        .join("; ")
    : "";
  return [data.error, detail].filter(Boolean).join(" — ") || fallback;
}

export function FuelExpensesPage({ user }: { user: SessionUser }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"fuel" | "expense">("fuel");
  const [showForm, setShowForm] = useState(false);
  const toast = useToast();
  const canEdit = canWrite(user.role as Role, "fuel");
  const [fuelForm, setFuelForm] = useState({ vehicleId: "", liters: "40", cost: "56" });
  const [expenseForm, setExpenseForm] = useState({ vehicleId: "", type: "Toll", amount: "12" });

  const { data: fuelLogs, isError: fuelLogsError, error: fuelLogsLoadError } = useQuery({
    queryKey: ["fuel-logs"],
    queryFn: async () => (await api.get<Paginated<FuelLog>>("/fuel-logs")).data,
    ...liveQueryDefaults
  });

  const { data: expenses } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => (await api.get<Paginated<Expense>>("/expenses")).data,
    ...liveQueryDefaults
  });

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles-list"],
    queryFn: async () => (await api.get<Paginated<Vehicle>>("/vehicles", { params: { limit: 100 } })).data
  });

  const createFuel = useMutation({
    mutationFn: async () =>
      (
        await api.post("/fuel-logs", {
          vehicleId: fuelForm.vehicleId,
          liters: normalizeDecimal(fuelForm.liters),
          cost: normalizeDecimal(fuelForm.cost)
        })
      ).data,
    onSuccess: async () => {
      setShowForm(false);
      setFuelForm({ vehicleId: "", liters: "40", cost: "56" });
      toast("Fuel log saved", "success");
      await qc.invalidateQueries({ queryKey: ["fuel-logs"] });
    },
    onError: (err: unknown) => toast(apiErrorMessage(err, "Failed to log fuel"), "error")
  });

  const createExpense = useMutation({
    mutationFn: async () =>
      (
        await api.post("/expenses", {
          vehicleId: expenseForm.vehicleId,
          type: expenseForm.type.trim(),
          amount: normalizeDecimal(expenseForm.amount)
        })
      ).data,
    onSuccess: async () => {
      setShowForm(false);
      setExpenseForm({ vehicleId: "", type: "Toll", amount: "12" });
      toast("Expense saved", "success");
      await qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (err: unknown) => toast(apiErrorMessage(err, "Failed to log expense"), "error")
  });

  return (
    <>
      <PageHeader
        title="Fuel & Expenses"
        subtitle="Operational cost tracking per vehicle"
        actions={canEdit && (
          <button className="btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Add record</button>
        )}
      />

      <div className="tabs">
        <button className={tab === "fuel" ? "active" : ""} onClick={() => setTab("fuel")}>Fuel logs</button>
        <button className={tab === "expense" ? "active" : ""} onClick={() => setTab("expense")}>Expenses</button>
      </div>

      <Panel>
        {fuelLogsError && tab === "fuel" && (
          <p className="form-error">{apiErrorMessage(fuelLogsLoadError, "Could not load fuel logs")}</p>
        )}
        {tab === "fuel" ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Vehicle</th><th>Liters</th><th>Cost</th><th>Date</th></tr></thead>
              <tbody>
                {fuelLogs?.items.map((f) => (
                  <tr key={f.id}>
                    <td>{f.vehicle?.registrationNumber ?? f.vehicleId.slice(0, 8)}</td>
                    <td>{f.liters} L</td>
                    <td>${Number(f.cost).toFixed(2)}</td>
                    <td>{new Date(f.recordedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Vehicle</th><th>Type</th><th>Amount</th><th>Date</th></tr></thead>
              <tbody>
                {expenses?.items.map((e) => (
                  <tr key={e.id}>
                    <td>{e.vehicle?.registrationNumber ?? e.vehicleId.slice(0, 8)}</td>
                    <td>{e.type}</td>
                    <td>${Number(e.amount).toFixed(2)}</td>
                    <td>{new Date(e.recordedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Modal open={showForm} title={tab === "fuel" ? "Log fuel" : "Log expense"} onClose={() => setShowForm(false)}>
        <div className="tabs" style={{ marginBottom: 12 }}>
          <button className={tab === "fuel" ? "active" : ""} onClick={() => setTab("fuel")}>Fuel</button>
          <button className={tab === "expense" ? "active" : ""} onClick={() => setTab("expense")}>Expense</button>
        </div>
        {tab === "fuel" ? (
          <>
            <div className="form-grid">
              <label>Vehicle
                <select value={fuelForm.vehicleId} onChange={(e) => setFuelForm({ ...fuelForm, vehicleId: e.target.value })}>
                  <option value="">Select</option>
                  {vehicles?.items.map((v) => <option key={v.id} value={v.id}>{v.registrationNumber}</option>)}
                </select>
              </label>
              <label>Liters<input value={fuelForm.liters} onChange={(e) => setFuelForm({ ...fuelForm, liters: e.target.value })} /></label>
              <label>Cost<input value={fuelForm.cost} onChange={(e) => setFuelForm({ ...fuelForm, cost: e.target.value })} /></label>
            </div>
            <button
              className="btn-primary"
              onClick={() => createFuel.mutate()}
              disabled={!fuelForm.vehicleId || createFuel.isPending}
            >
              {createFuel.isPending ? "Saving…" : "Save fuel log"}
            </button>
          </>
        ) : (
          <>
            <div className="form-grid">
              <label>Vehicle
                <select value={expenseForm.vehicleId} onChange={(e) => setExpenseForm({ ...expenseForm, vehicleId: e.target.value })}>
                  <option value="">Select</option>
                  {vehicles?.items.map((v) => <option key={v.id} value={v.id}>{v.registrationNumber}</option>)}
                </select>
              </label>
              <label>Type<input value={expenseForm.type} onChange={(e) => setExpenseForm({ ...expenseForm, type: e.target.value })} /></label>
              <label>Amount<input value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} /></label>
            </div>
            <button
              className="btn-primary"
              onClick={() => createExpense.mutate()}
              disabled={!expenseForm.vehicleId || createExpense.isPending}
            >
              {createExpense.isPending ? "Saving…" : "Save expense"}
            </button>
          </>
        )}
      </Modal>
    </>
  );
}
