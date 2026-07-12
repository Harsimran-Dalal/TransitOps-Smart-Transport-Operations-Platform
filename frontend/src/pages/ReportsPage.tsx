import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, FileText, TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import type { Role } from "@transitops/shared";
import { api } from "../lib/api";
import type { DashboardData, ReportRow, SessionUser } from "../lib/types";
import { canRead } from "../lib/permissions";
import { EmptyState, KpiCard, PageHeader, Panel } from "../components/ui";
import { useToast } from "../context/ToastContext";

export function ReportsPage({ user }: { user: SessionUser }) {
  const toast = useToast();
  const role = user.role as Role;
  const hasAccess = canRead(role, "reports");

  const { data: reports } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => (await api.get<ReportRow[]>("/reports")).data,
    enabled: hasAccess
  });

  const { data: dashboard } = useQuery({
    queryKey: ["reports-dashboard"],
    queryFn: async () => (await api.get<DashboardData>("/dashboard")).data,
    enabled: hasAccess
  });

  const { avgEfficiency, totalCost, avgRoi } = useMemo(() => {
    if (!reports || reports.length === 0) return { avgEfficiency: 0, totalCost: 0, avgRoi: 0 };
    const avgEff = reports.reduce((s, r) => s + r.fuelEfficiency, 0) / reports.length;
    const cost = reports.reduce((s, r) => s + r.operationalCost, 0);
    const roi = reports.reduce((s, r) => s + r.roi, 0) / reports.length;
    return { avgEfficiency: avgEff, totalCost: cost, avgRoi: roi * 100 };
  }, [reports]);

  const chartData = useMemo(
    () => (reports ?? []).map((r) => ({ label: r.registrationNumber, cost: r.operationalCost })).slice(0, 8),
    [reports]
  );

  if (!hasAccess) {
    return (
      <Panel>
        <EmptyState
          title="Access restricted"
          description="Reports are visible to Fleet Managers, Safety Officers, and Financial Analysts."
        />
      </Panel>
    );
  }

  const download = async (path: string, filename: string) => {
    try {
      const response = await api.get(path, { responseType: "blob" });
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      toast(`${filename} downloaded`, "success");
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? "Export failed";
      toast(message, "error");
    }
  };

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Fuel efficiency, operational cost, and vehicle ROI"
        actions={
          <>
            <button className="btn-secondary" onClick={() => download("/reports/export.csv", "transitops-reports.csv")}>
              <Download size={16} /> CSV
            </button>
            <button className="btn-primary" onClick={() => download("/reports/export.pdf", "transitops-reports.pdf")}>
              <FileText size={16} /> PDF
            </button>
          </>
        }
      />

      <motion.div
        className="kpi-grid"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <KpiCard
          label="Avg Fuel Efficiency"
          value={avgEfficiency}
          suffix=" km/L"
          icon={<TrendingUp size={20} />}
        />
        <KpiCard
          label="Fleet Utilization"
          value={dashboard?.fleetUtilization ?? 0}
          suffix="%"
          icon={<TrendingUp size={20} />}
        />
        <KpiCard label="Total Operating Cost" value={totalCost} icon={<TrendingDown size={20} />} />
        <KpiCard label="Avg Vehicle ROI" value={avgRoi} suffix="%" icon={<TrendingUp size={20} />} />
      </motion.div>

      <div className="reports-grid">
        <Panel delay={0.05}>
          <div className="panel-head">
            <h3>Operational cost by vehicle</h3>
          </div>
          {chartData.length === 0 ? (
            <EmptyState title="No cost data yet" description="Fuel logs, maintenance and expenses will show here." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid stroke="rgba(148,163,184,0.08)" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid rgba(251,191,36,0.2)",
                    borderRadius: 12
                  }}
                />
                <Bar dataKey="cost" fill="#ffffff" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel delay={0.1}>
          <div className="panel-head">
            <h3>Vehicle ROI</h3>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Fuel Efficiency</th>
                  <th>Utilization</th>
                  <th>Operational Cost</th>
                  <th>ROI</th>
                </tr>
              </thead>
              <tbody>
                {(reports ?? []).map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.registrationNumber}</strong>
                    </td>
                    <td>{row.fuelEfficiency.toFixed(2)} km/L</td>
                    <td>{row.fleetUtilization.toFixed(1)}%</td>
                    <td>${row.operationalCost.toFixed(2)}</td>
                    <td className={row.roi >= 0 ? "positive" : "negative"}>{(row.roi * 100).toFixed(2)}%</td>
                  </tr>
                ))}
                {(reports ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        title="No reports yet"
                        description="Complete trips and log costs to generate ROI data."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
