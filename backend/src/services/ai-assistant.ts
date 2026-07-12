import { DriverStatus, PrismaClient, TripStatus, VehicleStatus } from "@prisma/client";
import { ApiError } from "../lib/errors.js";
import { listExpiringDrivers } from "./drivers.js";

type Db = PrismaClient;

export type FleetContext = {
  vehicles: { total: number; available: number; onTrip: number; inShop: number };
  trips: { draft: number; dispatched: number; completedToday: number };
  drivers: { available: number; onTrip: number; suspended: number; licensesExpiringSoon: number };
  activeDispatches: {
    vehicle: string;
    driver: string;
    route: string;
    elapsedMinutes: number;
  }[];
  openMaintenance: number;
};

export async function buildFleetContext(db: Db): Promise<FleetContext> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    available,
    onTrip,
    inShop,
    total,
    draft,
    dispatched,
    completedToday,
    driversAvailable,
    driversOnTrip,
    suspended,
    expiring,
    maintenanceOpen,
    activeTrips
  ] = await Promise.all([
    db.vehicle.count({ where: { status: VehicleStatus.AVAILABLE } }),
    db.vehicle.count({ where: { status: VehicleStatus.ON_TRIP } }),
    db.vehicle.count({ where: { status: VehicleStatus.IN_SHOP } }),
    db.vehicle.count(),
    db.trip.count({ where: { status: TripStatus.DRAFT } }),
    db.trip.count({ where: { status: TripStatus.DISPATCHED } }),
    db.trip.count({ where: { status: TripStatus.COMPLETED, completedAt: { gte: startOfDay } } }),
    db.driver.count({ where: { status: DriverStatus.AVAILABLE } }),
    db.driver.count({ where: { status: DriverStatus.ON_TRIP } }),
    db.driver.count({ where: { status: DriverStatus.SUSPENDED } }),
    listExpiringDrivers(db, 30),
    db.maintenanceLog.count({ where: { isOpen: true } }),
    db.trip.findMany({
      where: { status: TripStatus.DISPATCHED },
      include: { vehicle: true, driver: true },
      take: 8,
      orderBy: { dispatchedAt: "desc" }
    })
  ]);

  return {
    vehicles: { total, available, onTrip, inShop },
    trips: { draft, dispatched, completedToday },
    drivers: {
      available: driversAvailable,
      onTrip: driversOnTrip,
      suspended,
      licensesExpiringSoon: expiring.length
    },
    activeDispatches: activeTrips.map((t) => ({
      vehicle: t.vehicle.registrationNumber,
      driver: t.driver.name,
      route: `${t.source} → ${t.destination}`,
      elapsedMinutes: t.dispatchedAt
        ? Math.floor((Date.now() - t.dispatchedAt.getTime()) / 60_000)
        : 0
    })),
    openMaintenance: maintenanceOpen
  };
}

export async function askFleetCopilot(db: Db, question: string) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new ApiError(
      503,
      "Fleet Copilot is not configured. Add GEMINI_API_KEY to the backend environment to enable AI search."
    );
  }

  const context = await buildFleetContext(db);
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";

  const systemPrompt = `You are TransitOps Fleet Copilot — a concise logistics assistant for a transport fleet platform.
Answer using ONLY the live fleet data below. If data is missing, say so briefly.
Use bullet points for lists. Keep answers under 120 words unless the user asks for detail.
Never invent vehicles, drivers, or trips not in the data.

LIVE FLEET SNAPSHOT:
${JSON.stringify(context, null, 2)}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\nUser question: ${question}` }]
          }
        ],
        generationConfig: { temperature: 0.3, maxOutputTokens: 512 }
      })
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new ApiError(502, `Gemini API error: ${errText.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const answer =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("")?.trim() ||
    "I couldn't generate an answer. Try rephrasing your question.";

  return { answer, contextSummary: context };
}
