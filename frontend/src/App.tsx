import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "./lib/api";
import { useAuth } from "./hooks/useAuth";
import { useTheme } from "./hooks/useTheme";
import { ToastProvider } from "./context/ToastContext";
import { AppLayout } from "./components/AppLayout";
import { PageTransition } from "./components/motion";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { VehiclesPage } from "./pages/VehiclesPage";
import { DriversPage } from "./pages/DriversPage";
import { TripsPage } from "./pages/TripsPage";
import { MaintenancePage } from "./pages/MaintenancePage";
import { FuelExpensesPage } from "./pages/FuelExpensesPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import type { SessionUser } from "./lib/types";
import { canRead } from "./lib/permissions";
import type { Role } from "@transitops/shared";

function ProtectedRoute({ user, section, children }: { user: SessionUser; section: string; children: React.ReactNode }) {
  if (!canRead(user.role as Role, section)) return <Navigate to="/dashboard" replace />;
  return <PageTransition key={section}>{children}</PageTransition>;
}

function AppRoutes({ session, onDeleteAccount }: { session: SessionUser; onDeleteAccount: () => Promise<void> }) {
  const location = useLocation();
  return (
    <Routes location={location}>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<ProtectedRoute user={session} section="dashboard"><DashboardPage /></ProtectedRoute>} />
      <Route path="/vehicles" element={<ProtectedRoute user={session} section="vehicles"><VehiclesPage user={session} /></ProtectedRoute>} />
      <Route path="/drivers" element={<ProtectedRoute user={session} section="drivers"><DriversPage user={session} /></ProtectedRoute>} />
      <Route path="/trips" element={<ProtectedRoute user={session} section="trips"><TripsPage user={session} /></ProtectedRoute>} />
      <Route path="/maintenance" element={<ProtectedRoute user={session} section="maintenance"><MaintenancePage user={session} /></ProtectedRoute>} />
      <Route path="/fuel-expenses" element={<ProtectedRoute user={session} section="fuel"><FuelExpensesPage user={session} /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute user={session} section="reports"><ReportsPage user={session} /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute user={session} section="settings"><SettingsPage user={session} onDeleteAccount={onDeleteAccount} /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loader-ring" />
      <p>Connecting to fleet network…</p>
    </div>
  );
}

function AuthenticatedApp({ session }: { session: SessionUser }) {
  const queryClient = useQueryClient();
  const { theme, toggle } = useTheme();

  const logout = async () => {
    await api.post("/auth/logout");
    await queryClient.invalidateQueries({ queryKey: ["session"] });
  };

  const deleteAccount = async () => {
    await queryClient.invalidateQueries({ queryKey: ["session"] });
  };

  return (
    <AppLayout user={session} onLogout={logout} theme={theme} onToggleTheme={toggle}>
      <AppRoutes session={session} onDeleteAccount={deleteAccount} />
    </AppLayout>
  );
}

export default function App() {
  const { data: session, isLoading } = useAuth();

  return (
    <ToastProvider>
      <BrowserRouter>
        {isLoading ? (
          <LoadingScreen />
        ) : !session ? (
          <Routes>
            <Route path="*" element={<LoginPage />} />
          </Routes>
        ) : (
          <AuthenticatedApp session={session} />
        )}
      </BrowserRouter>
    </ToastProvider>
  );
}
