import cron from "node-cron";
import { prisma } from "../db/prisma.js";
import { sendLicenseExpiryReminders } from "../services/notifications.js";

export function startLicenseReminderJob() {
  if (process.env.ENABLE_LICENSE_CRON !== "true") {
    return;
  }

  const schedule = process.env.LICENSE_REMINDER_CRON ?? "0 8 * * *";
  cron.schedule(schedule, async () => {
    try {
      const result = await sendLicenseExpiryReminders(prisma);
      console.info(`License reminders processed: ${result.count}`);
    } catch (error) {
      console.error("License reminder job failed", error);
    }
  });
}
