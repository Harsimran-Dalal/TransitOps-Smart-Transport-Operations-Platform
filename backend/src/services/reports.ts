import { TripStatus, VehicleStatus } from "@prisma/client";
import PDFDocument from "pdfkit";
import { PrismaClient } from "@prisma/client";
import { decimalToNumber } from "../lib/utils.js";

type Db = PrismaClient;

function vehicleUtilizationPercent(
  trips: { status: TripStatus }[],
  vehicleStatus: VehicleStatus
) {
  if (vehicleStatus === VehicleStatus.RETIRED) return 0;
  const relevant = trips.filter((trip) => trip.status !== TripStatus.CANCELLED);
  if (relevant.length === 0) {
    return vehicleStatus === VehicleStatus.ON_TRIP ? 100 : 0;
  }
  const utilized = relevant.filter(
    (trip) => trip.status === TripStatus.DISPATCHED || trip.status === TripStatus.COMPLETED
  ).length;
  return (utilized / relevant.length) * 100;
}

export async function reportsForFleet(db: Db) {
  const vehicles = await db.vehicle.findMany({
    include: { trips: true, maintenanceLogs: true, fuelLogs: true, expenses: true }
  });

  return vehicles.map((vehicle) => {
    const completedTrips = vehicle.trips.filter((trip) => trip.status === TripStatus.COMPLETED);
    const totalDistance = completedTrips.reduce((sum, trip) => sum + decimalToNumber(trip.plannedDistance), 0);
    const totalFuel = completedTrips.reduce((sum, trip) => sum + decimalToNumber(trip.fuelConsumed), 0);
    const totalRevenue = completedTrips.reduce((sum, trip) => sum + decimalToNumber(trip.revenue), 0);
    const maintenanceCost = vehicle.maintenanceLogs.reduce((sum, log) => sum + decimalToNumber(log.cost), 0);
    const fuelCost = vehicle.fuelLogs.reduce((sum, log) => sum + decimalToNumber(log.cost), 0);
    const expenseCost = vehicle.expenses.reduce((sum, expense) => sum + decimalToNumber(expense.amount), 0);
    const operationalCost = maintenanceCost + fuelCost + expenseCost;
    const acquisitionCost = decimalToNumber(vehicle.acquisitionCost);

    return {
      id: vehicle.id,
      registrationNumber: vehicle.registrationNumber,
      fuelEfficiency: totalFuel === 0 ? 0 : totalDistance / totalFuel,
      fleetUtilization: vehicleUtilizationPercent(vehicle.trips, vehicle.status),
      operationalCost,
      roi: acquisitionCost === 0 ? 0 : (totalRevenue - (maintenanceCost + fuelCost)) / acquisitionCost
    };
  });
}

export async function reportsCsv(db: Db) {
  const rows = await reportsForFleet(db);
  const header = "registrationNumber,fuelEfficiency,fleetUtilization,operationalCost,roi";
  const body = rows.map(
    (row) =>
      `"${row.registrationNumber}",${row.fuelEfficiency.toFixed(2)},${row.fleetUtilization.toFixed(2)},${row.operationalCost.toFixed(2)},${row.roi.toFixed(4)}`
  );
  return [header, ...body].join("\n");
}

export async function reportsPdf(db: Db): Promise<Buffer> {
  const rows = await reportsForFleet(db);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text("TransitOps Fleet Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(10);

    for (const row of rows) {
      doc.text(
        `${row.registrationNumber} | Fuel Eff: ${row.fuelEfficiency.toFixed(2)} | Util: ${row.fleetUtilization.toFixed(1)}% | Cost: ${row.operationalCost.toFixed(2)} | ROI: ${row.roi.toFixed(4)}`
      );
    }

    doc.end();
  });
}
