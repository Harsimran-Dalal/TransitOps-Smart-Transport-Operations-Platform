import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, KeyRound, Mail, Trash2, UserPlus } from "lucide-react";
import type { Role } from "@transitops/shared";
import { api } from "../lib/api";
import type { SessionUser } from "../lib/types";
import { canWrite, ROLES, roleLabel } from "../lib/permissions";
import { EmptyState, PageHeader, Panel, StatusBadge } from "../components/ui";
import { useToast } from "../context/ToastContext";

type AccountRow = {
  id: string;
  email: string;
  role: Role;
  authProvider?: string;
  createdAt: string;
};

const defaultForm = {
  email: "",
  password: "",
  role: "DRIVER" as Role
};

export function SettingsPage({ user, onDeleteAccount }: { user: SessionUser; onDeleteAccount?: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const canEdit = canWrite(user.role as Role, "settings");
  const canManageCompliance = canWrite(user.role as Role, "drivers");
  const [form, setForm] = useState(defaultForm);

  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => (await api.get<AccountRow[]>("/auth/accounts")).data,
    enabled: canEdit
  });

  const deleteSelf = useMutation({
    mutationFn: async () => api.delete("/auth/me"),
    onSuccess: () => {
      toast("Account deleted", "success");
      onDeleteAccount?.();
    },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast(err.response?.data?.error ?? "Failed to delete account", "error")
  });

  const create = useMutation({
    mutationFn: async () =>
      (
        await api.post("/auth/accounts", {
          email: form.email,
          role: form.role,
          password: form.password
        })
      ).data,
    onSuccess: async () => {
      toast("Account created", "success");
      setForm(defaultForm);
      await qc.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast(err.response?.data?.error ?? "Failed to create account", "error")
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/auth/accounts/${id}`),
    onSuccess: async () => {
      toast("Account removed", "success");
      await qc.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast(err.response?.data?.error ?? "Failed to remove account", "error")
  });

  const sendReminders = useMutation({
    mutationFn: async () => (await api.post("/notifications/test-license-reminders")).data as { count: number },
    onSuccess: (data) => toast(`License reminders processed for ${data.count} driver(s)`, "success"),
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast(err.response?.data?.error ?? "Reminder job failed", "error")
  });

  return (
    <>
      <PageHeader
        title="Settings & RBAC"
        subtitle="Manage user accounts, roles, and access permissions"
      />

      <Panel className="settings-account">
        <div className="panel-head">
          <h3>
            <Trash2 size={16} /> Your account
          </h3>
        </div>
        <div className="account-self">
          <div>
            <strong>{user.email}</strong>
            <p className="muted">{roleLabel(user.role as Role)} · signed in with password</p>
          </div>
          <button
            type="button"
            className="btn-danger-sm"
            disabled={deleteSelf.isPending}
            onClick={() => {
              if (
                window.confirm(
                  "Delete your TransitOps account permanently? This cannot be undone and you will lose access immediately."
                )
              ) {
                deleteSelf.mutate();
              }
            }}
          >
            {deleteSelf.isPending ? "Deleting…" : "Delete my account"}
          </button>
        </div>
      </Panel>

      <Panel className="settings-form">
          <div className="panel-head">
            <h3>
              <UserPlus size={16} /> Add account
            </h3>
          </div>
          {!canEdit ? (
            <EmptyState
              title="Read-only"
              description="Only Fleet Managers can manage accounts. Contact your administrator to request changes."
            />
          ) : (
            <form
              className="form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.email) {
                  toast("Email is required", "error");
                  return;
                }
                if (form.password.length < 8) {
                  toast("Password must be at least 8 characters", "error");
                  return;
                }
                create.mutate();
              }}
            >
              <label>
                Work email
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="user@company.com"
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min 8 characters"
                  minLength={8}
                  required
                />
              </label>
              <label>
                Role
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="role-hint">{ROLES.find((r) => r.value === form.role)?.description}</p>
              <button type="submit" className="btn-primary btn-full" disabled={create.isPending}>
                <KeyRound size={16} /> {create.isPending ? "Creating…" : "Create account"}
              </button>
            </form>
          )}
        </Panel>

      <Panel delay={0.05}>
        <div className="panel-head">
          <h3>Team accounts</h3>
          <span className="muted">{accounts?.length ?? 0} member{(accounts?.length ?? 0) === 1 ? "" : "s"}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Sign-in</th>
                <th>Added</th>
                <th>Status</th>
                {canEdit && <th></th>}
              </tr>
            </thead>
            <tbody>
              {(accounts ?? []).map((a) => (
                <motion.tr
                  key={a.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <td>
                    <strong>{a.email}</strong>
                    {a.id === user.id && <span className="you-chip">You</span>}
                  </td>
                  <td>{roleLabel(a.role)}</td>
                  <td className="muted">Password</td>
                  <td className="muted">{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td>
                    <StatusBadge status="AVAILABLE" />
                  </td>
                  {canEdit && (
                    <td>
                      {a.id !== user.id && (
                        <button
                          type="button"
                          className="btn-danger-sm"
                          onClick={() => {
                            if (window.confirm(`Remove ${a.email}?`)) remove.mutate(a.id);
                          }}
                          disabled={remove.isPending}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  )}
                </motion.tr>
              ))}
              {(accounts ?? []).length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 5 : 4}>
                    <EmptyState title="No accounts yet" description="Add the first team member using the form above." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel delay={0.1} className="settings-tip">
        <Mail size={16} />
        <div>
          <strong>License expiry reminders</strong>
          <p className="muted">
            Drivers with licenses expiring within 30 days receive email reminders when SMTP is configured.
            Add each driver&apos;s email on the Drivers page.
          </p>
          {canManageCompliance && (
            <button
              type="button"
              className="btn-secondary"
              style={{ marginTop: "0.75rem" }}
              onClick={() => sendReminders.mutate()}
              disabled={sendReminders.isPending}
            >
              {sendReminders.isPending ? "Sending…" : "Run reminder check now"}
            </button>
          )}
        </div>
      </Panel>

      <Panel delay={0.12} className="settings-tip">
        <Check size={16} />
        <div>
          <strong>Security tip</strong>
          <p className="muted">
            Ask new users to change their temporary password immediately. Passwords are hashed with bcrypt (cost 12) and never
            stored in plaintext.
          </p>
        </div>
      </Panel>
    </>
  );
}
