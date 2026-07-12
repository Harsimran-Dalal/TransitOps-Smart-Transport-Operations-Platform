import type { Role } from "@transitops/shared";

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  driverId?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  authProvider?: string;
};

export type Paginated<T> = {
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type Vehicle = {
  id: string;
  registrationNumber: string;
  nameModel: string;
  type: string;
  maximumLoadCapacity: string;
  odometer: string;
  acquisitionCost: string;
  region: string;
  status: string;
};

export type Driver = {
  id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiryDate: string;
  contactNumber: string;
  email?: string | null;
  safetyScore: string;
  status: string;
};

export type Trip = {
  id: string;
  source: string;
  destination: string;
  vehicleId: string;
  driverId: string;
  cargoWeight: string;
  plannedDistance: string;
  finalOdometer?: string | null;
  fuelConsumed?: string | null;
  revenue: string;
  status: string;
  liveLocationUrl?: string | null;
  dispatchedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  vehicle?: Vehicle;
  driver?: Driver;
};

export type MaintenanceLog = {
  id: string;
  vehicleId: string;
  description: string;
  cost: string;
  isOpen: boolean;
  openedAt: string;
  closedAt?: string | null;
  vehicle?: Vehicle;
};

export type LiveVehicleTrack = {
  tripId: string;
  vehicleId: string;
  registrationNumber: string;
  driverName: string;
  source: string;
  destination: string;
  status: string;
  lat: number;
  lng: number;
  progress: number;
  route: {
    from: { lat: number; lng: number; label: string };
    to: { lat: number; lng: number; label: string };
  };
  dispatchedAt: string | null;
  elapsedMinutes: number;
};

export type FleetMapData = {
  tracks: LiveVehicleTrack[];
  stats: { available: number; onTrip: number; inShop: number; pending: number; live: number };
};

export type DashboardData = {
  activeVehicles: number;
  availableVehicles: number;
  inShopVehicles: number;
  activeTrips: number;
  pendingTrips: number;
  driversOnDuty: number;
  fleetUtilization: number;
  utilizationTrend: { label: string; value: number }[];
  costBreakdown: { label: string; value: number }[];
};

export type ReportRow = {
  id: string;
  registrationNumber: string;
  fuelEfficiency: number;
  fleetUtilization: number;
  operationalCost: number;
  roi: number;
};
