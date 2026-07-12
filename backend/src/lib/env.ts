import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(10),
  JWT_SECRET: z.string().min(16).optional(),
  CORS_ORIGINS: z.string().optional(),
  COOKIE_CROSS_SITE: z.enum(["true", "false"]).optional(),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  LICENSE_REMINDER_CRON: z.string().default("0 8 * * *"),
  FRONTEND_URL: z.string().url().optional()
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }
  if (parsed.data.NODE_ENV === "production" && !parsed.data.JWT_SECRET) {
    throw new Error("JWT_SECRET is required in production");
  }
  return parsed.data;
}

export const corsOrigins = (raw?: string): string[] | true => {
  if (!raw) return true;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};
