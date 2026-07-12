import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import request from "supertest";

describe("health", () => {
  it("returns ok", async () => {
    const app = createApp();
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });
});

describe("auth", () => {
  it("rejects invalid login payload", async () => {
    const app = createApp();
    const response = await request(app).post("/auth/login").send({ email: "bad", password: "x" });
    expect(response.status).toBe(400);
  });
});
