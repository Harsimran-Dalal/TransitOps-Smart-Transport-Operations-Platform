import { DriverStatus, PrismaClient, TripStatus, VehicleStatus } from "@prisma/client";
import type { Role } from "@transitops/shared";
import { canReadSection } from "@transitops/shared";
import { listExpiringDrivers } from "./drivers.js";

type Db = PrismaClient;

export type NotificationItem = {
  id: string;
  kind: "action" | "info" | "warning";
  title: string;
  message: string;
  link: string;
  createdAt: string;
};

export async function getNotificationFeed(db: Db, role: Role): Promise<NotificationItem[]> {
  const items: NotificationItem[] = [];
  const withinDays = Number(process.env.LICENSE_REMINDER_DAYS ?? 30);

  if (canReadSection(role, "trips")) {
    const [drafts, active] = await Promise.all([
      db.trip.findMany({
        where: { status: TripStatus.DRAFT },
        include: { vehicle: true, driver: true },
        orderBy: { createdAt: "desc" },
        take: 15
      }),
      db.trip.findMany({
        where: { status: TripStatus.DISPATCHED },
        include: { vehicle: true, driver: true },
        orderBy: { dispatchedAt: "desc" },
        take: 15
      })
    ]);

    for (const trip of drafts) {
      items.push({
        id: `draft-${trip.id}`,
        kind: "action",
        title: "Trip awaiting dispatch",
        message: `${trip.source} → ${trip.destination} · ${trip.vehicle.registrationNumber} / ${trip.driver.name}`,
        link: "/trips",
        createdAt: trip.createdAt.toISOString()
      });
    }

    for (const trip of active) {
      items.push({
        id: `active-${trip.id}`,
        kind: "info",
        title: "Vehicle on active dispatch",
        message: `${trip.vehicle.registrationNumber} · ${trip.driver.name} → ${trip.destination}`,
        link: "/trips",
        createdAt: (trip.dispatchedAt ?? trip.updatedAt).toISOString()
      });
    }
  }

  if (canReadSection(role, "drivers")) {
    const expiring = await listExpiringDrivers(db, withinDays);
    for (const driver of expiring) {
      items.push({
        id: `license-${driver.id}`,
        kind: "warning",
        title: "Driver license expiring soon",
        message: `${driver.name} · expires ${driver.licenseExpiryDate.toISOString().slice(0, 10)}`,
        link: "/drivers",
        createdAt: driver.licenseExpiryDate.toISOString()
      });
    }

    const suspended = await db.driver.count({ where: { status: DriverStatus.SUSPENDED } });
    if (suspended > 0) {
      items.push({
        id: "suspended-drivers",
        kind: "warning",
        title: "Suspended drivers",
        message: `${suspended} driver(s) cannot be assigned until reinstated`,
        link: "/drivers",
        createdAt: new Date().toISOString()
      });
    }
  }

  if (canReadSection(role, "maintenance")) {
    const openLogs = await db.maintenanceLog.findMany({
      where: { isOpen: true },
      include: { vehicle: true },
      orderBy: { openedAt: "desc" },
      take: 10
    });
    for (const log of openLogs) {
      items.push({
        id: `maint-${log.id}`,
        kind: "action",
        title: "Open maintenance record",
        message: `${log.vehicle.registrationNumber} · ${log.description}`,
        link: "/maintenance",
        createdAt: log.openedAt.toISOString()
      });
    }
  }

  if (canReadSection(role, "vehicles")) {
    const inShop = await db.vehicle.count({ where: { status: VehicleStatus.IN_SHOP } });
    if (inShop > 0) {
      items.push({
        id: "vehicles-in-shop",
        kind: "info",
        title: "Vehicles in maintenance",
        message: `${inShop} vehicle(s) unavailable for dispatch`,
        link: "/vehicles",
        createdAt: new Date().toISOString()
      });
    }
  }

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 40);
}
