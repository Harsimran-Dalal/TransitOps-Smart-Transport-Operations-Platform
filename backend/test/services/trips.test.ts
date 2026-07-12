import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/lib/errors.js";
import { dispatchTrip, cancelTrip, completeTrip } from "../../src/services/trips.js";
import { closeMaintenanceLog, createMaintenanceLog } from "../../src/services/maintenance.js";

function fakeDb(overrides: Record<string, unknown> = {}) {
  const store: any = {
    vehicle: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn(), create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    driver: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn(), create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    trip: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    maintenanceLog: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    fuelLog: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    expense: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    $transaction: vi.fn(async (handler: any) => handler(store))
  };
  return Object.assign(store, overrides);
}

describe("dispatchTrip", () => {
  it("rejects overweight cargo", async () => {
    const db = fakeDb();
    db.trip.findUnique.mockResolvedValue({
      id: "trip-1",
      status: "DRAFT",
      cargoWeight: 101,
      vehicle: { id: "vehicle-1", status: "AVAILABLE", maximumLoadCapacity: 100 },
      driver: { id: "driver-1", status: "AVAILABLE", licenseExpiryDate: new Date(Date.now() + 86400000) }
    });
    await expect(dispatchTrip(db, "trip-1")).rejects.toBeInstanceOf(ApiError);
  });

  it("rejects expired drivers", async () => {
    const db = fakeDb();
    db.trip.findUnique.mockResolvedValue({
      id: "trip-1",
      status: "DRAFT",
      cargoWeight: 10,
      vehicle: { id: "vehicle-1", status: "AVAILABLE", maximumLoadCapacity: 100 },
      driver: { id: "driver-1", status: "AVAILABLE", licenseExpiryDate: new Date(Date.now() - 86400000) }
    });
    await expect(dispatchTrip(db, "trip-1")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("trip lifecycle", () => {
  it("completes dispatched trips and restores availability", async () => {
    const db = fakeDb();
    db.trip.findUnique
      .mockResolvedValueOnce({
        id: "trip-1",
        status: "DISPATCHED",
        vehicleId: "vehicle-1",
        driverId: "driver-1",
        vehicle: { odometer: 0 },
        driver: {}
      })
      .mockResolvedValueOnce({ id: "trip-1", status: "COMPLETED" });
    await completeTrip(db, { tripId: "trip-1", finalOdometer: "120", fuelConsumed: "20" });
    expect(db.trip.update).toHaveBeenCalled();
    expect(db.vehicle.update).toHaveBeenCalled();
    expect(db.driver.update).toHaveBeenCalled();
  });

  it("cancels dispatched trips", async () => {
    const db = fakeDb();
    db.trip.findUnique.mockResolvedValue({
      id: "trip-1",
      status: "DISPATCHED",
      vehicleId: "vehicle-1",
      driverId: "driver-1",
      vehicle: {},
      driver: {}
    });
    db.trip.update.mockResolvedValue({ id: "trip-1", status: "CANCELLED" });
    await cancelTrip(db, "trip-1");
    expect(db.trip.update).toHaveBeenCalled();
  });
});

describe("maintenance", () => {
  it("keeps retired vehicles retired when maintenance closes", async () => {
    const db = fakeDb();
    db.maintenanceLog.findUnique.mockResolvedValue({ id: "log-1", vehicleId: "vehicle-1", isOpen: true, vehicle: { status: "RETIRED" } });
    db.maintenanceLog.count.mockResolvedValue(0);
    db.maintenanceLog.update.mockResolvedValue({});
    await closeMaintenanceLog(db, "log-1");
    expect(db.vehicle.update).toHaveBeenCalled();
  });

  it("rejects maintenance on on-trip vehicles", async () => {
    const db = fakeDb();
    db.vehicle.findUnique.mockResolvedValue({ id: "vehicle-1", status: "ON_TRIP" });
    await expect(createMaintenanceLog(db, { vehicleId: "vehicle-1", description: "Oil Change", cost: "120" })).rejects.toBeInstanceOf(ApiError);
  });
});
