import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";
import { listExpiringDrivers } from "./drivers.js";

type Db = PrismaClient;

function createTransport() {
  const host = process.env.SMTP_HOST;
  if (!host) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined
  });
}

export async function sendLicenseExpiryReminders(db: Db) {
  const withinDays = Number(process.env.LICENSE_REMINDER_DAYS ?? 30);
  const drivers = await listExpiringDrivers(db, withinDays);
  const transport = createTransport();
  const from = process.env.SMTP_FROM ?? "TransitOps <noreply@transitops.local>";
  const fallbackTo = process.env.SMTP_TO ?? "safety@transitops.local";
  const results: { driverId: string; sent: boolean; reason?: string }[] = [];

  for (const driver of drivers) {
    const message = {
      from,
      to: driver.email ?? fallbackTo,
      subject: `License expiring soon: ${driver.name}`,
      text: `Driver ${driver.name} (${driver.licenseNumber}) license expires on ${driver.licenseExpiryDate.toISOString().slice(0, 10)}. Contact: ${driver.contactNumber}.`
    };

    if (!transport) {
      console.info("[license-reminder]", message.subject, message.text);
      results.push({ driverId: driver.id, sent: false, reason: "SMTP not configured (logged to console)" });
      continue;
    }

    await transport.sendMail(message);
    results.push({ driverId: driver.id, sent: true });
  }

  return { count: drivers.length, results };
}

export async function testLicenseReminder(db: Db) {
  return sendLicenseExpiryReminders(db);
}
