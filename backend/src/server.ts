import dotenv from "dotenv";
import { createApp } from "./app.js";
import { loadEnv } from "./lib/env.js";
import { startLicenseReminderJob } from "./jobs/license-reminders.js";

dotenv.config();
const env = loadEnv();

const app = createApp();

startLicenseReminderJob();

app.listen(env.PORT, "0.0.0.0", () => {
  console.info(`TransitOps API listening on port ${env.PORT} (${env.NODE_ENV})`);
});
