import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

describe("Backend Express API & Security Smoke Checks", () => {
  const app = createApp();

  it("GET /health returns service status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("GET /api/catalog/products returns graceful empty list when DB env is unconfigured", async () => {
    const res = await request(app).get("/api/catalog/products");
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it("blocks unauthenticated access to protected customer, seller, checkout, and admin endpoints", async () => {
    const endpoints = [
      { method: "get" as const, path: "/api/cart" },
      { method: "post" as const, path: "/api/bookings/checkout" },
      { method: "get" as const, path: "/api/seller/dashboard" },
      { method: "get" as const, path: "/api/admin/dashboard" },
    ];

    for (const ep of endpoints) {
      const res = await request(app)[ep.method](ep.path);
      expect([401, 503]).toContain(res.status);
    }
  });
});
