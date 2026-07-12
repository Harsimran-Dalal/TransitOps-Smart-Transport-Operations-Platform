import express from "express";
import cookieParser from "cookie-parser";
import cors, { type CorsOptions } from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { ApiError } from "./lib/errors.js";
import { corsOrigins } from "./lib/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRouter } from "./routes/auth.js";
import { vehiclesRouter } from "./routes/vehicles.js";
import { driversRouter } from "./routes/drivers.js";
import { tripsRouter } from "./routes/trips.js";
import { maintenanceRouter } from "./routes/maintenance.js";
import { fuelRouter, expensesRouter } from "./routes/fuel-expenses.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { reportsRouter } from "./routes/reports.js";
import { documentsRouter, notificationsRouter } from "./routes/documents.js";
import { trackingRouter, aiRouter } from "./routes/tracking.js";
import { healthRouter } from "./routes/health.js";

export function createApp() {
  const app = express();

  if (process.env.TRUST_PROXY === "true" || process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  const allowed = corsOrigins(process.env.CORS_ORIGINS);
  const corsOptions: CorsOptions = {
    credentials: true,
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowed === true) return callback(null, true);
      if (allowed.includes(origin)) return callback(null, true);
      return callback(new ApiError(403, `Origin ${origin} not allowed by CORS`));
    }
  };

  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors(corsOptions));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(pinoHttp({ redact: ["req.headers.cookie", "req.headers.authorization"] }));

  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/dashboard", dashboardRouter);
  app.use("/vehicles", vehiclesRouter);
  app.use("/drivers", driversRouter);
  app.use("/trips", tripsRouter);
  app.use("/maintenance", maintenanceRouter);
  app.use("/fuel-logs", fuelRouter);
  app.use("/expenses", expensesRouter);
  app.use("/reports", reportsRouter);
  app.use("/", documentsRouter);
  app.use("/notifications", notificationsRouter);
  app.use("/tracking", trackingRouter);
  app.use("/ai", aiRouter);

  app.use((_request, _response, next) => next(new ApiError(404, "Not found")));
  app.use(errorHandler);

  return app;
}
