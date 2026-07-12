import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertCircle, Shield, Truck, Zap } from "lucide-react";
import { api } from "../lib/api";
import { fetchSession } from "../hooks/useAuth";
import { ROLES } from "../lib/permissions";
import type { Role } from "@transitops/shared";

type Mode = "signin" | "signup";

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>("DRIVER");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const path = mode === "signin" ? "/auth/login" : "/auth/register";
      const body = mode === "signin" ? { email, password } : { email, password, role };
      await api.post(path, body);
      await queryClient.fetchQuery({ queryKey: ["session"], queryFn: fetchSession });
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (mode === "signin" ? "Sign in failed. Check your email and password." : "Could not create account.");
      setError(message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-mesh" aria-hidden />

      <div className="login-layout">
        <motion.section
          className="login-showcase"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="eyebrow">
            <Zap size={14} /> Real-time logistics platform
          </span>
          <h1>
            Operate your fleet like
            <span className="gradient-text"> Uber for logistics</span>
          </h1>
          <p>
            Dispatch trips, track drivers, monitor maintenance, and analyze costs — with live data that updates as your
            fleet moves.
          </p>

          <div className="feature-grid">
            {[
              { icon: <Truck size={18} />, t: "Fleet lifecycle", d: "Vehicles, capacity, regions" },
              { icon: <Shield size={18} />, t: "Compliance", d: "Licenses, safety scores" },
              { icon: <Zap size={18} />, t: "Live dispatch", d: "Draft → dispatch → complete" }
            ].map((f, i) => (
              <motion.div
                key={f.t}
                className="feature-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                whileHover={{ y: -4, borderColor: "rgba(34, 211, 238, 0.4)" }}
              >
                {f.icon}
                <strong>{f.t}</strong>
                <span>{f.d}</span>
              </motion.div>
            ))}
          </div>

          <div className="role-list">
            <p className="role-list-title">Role-based access for your team</p>
            {ROLES.map((r) => (
              <div key={r.value} className="role-pill static">
                <div>
                  <strong>{r.label}</strong>
                  <span>{r.description}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.div
          className="login-card glass-panel"
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="login-card-head">
            <div className="brand-mark sm">
              <Truck size={18} />
            </div>
            <div>
              <h2>{mode === "signin" ? "Sign in to TransitOps" : "Create your account"}</h2>
              <p className="muted">
                {mode === "signin" ? "Use the email and password you registered with" : "Choose your own email and password"}
              </p>
            </div>
          </div>

          <div className="login-tabs">
            <button
              type="button"
              className={mode === "signin" ? "active" : ""}
              onClick={() => {
                setMode("signin");
                setError(null);
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === "signup" ? "active" : ""}
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
            >
              Create account
            </button>
          </div>

          {error && (
            <p className="form-error">
              <AlertCircle size={14} /> {error}
            </p>
          )}

          <form className="login-form" onSubmit={submit}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                minLength={8}
                required
              />
            </label>
            {mode === "signup" && (
              <>
                <label>
                  Your role
                  <select value={role} onChange={(e) => setRole(e.target.value as Role)} required>
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="role-hint">{ROLES.find((r) => r.value === role)?.description}</p>
                <label>
                  Confirm password
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </label>
              </>
            )}
            <motion.button
              type="submit"
              className="btn-primary btn-full"
              disabled={pending}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {pending ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </motion.button>
          </form>

          <p className="login-footnote muted">
            {mode === "signup"
              ? "Pick the role that matches how you'll use TransitOps. Fleet Managers can change roles later in Settings."
              : "New here? Switch to Create account and register with any email and password you choose."}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
