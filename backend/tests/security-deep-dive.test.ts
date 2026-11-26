import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

describe("Security Deep Dive: Authentication, RBAC, Validation & Sanitization", () => {
  const app = createApp();

  it("blocks unauthenticated access to customer dashboard (returns 401/503 depending on Supabase config)", async () => {
    const res = await request(app).get("/api/customer/dashboard");
    expect([401, 503]).toContain(res.status);
    expect(res.body.error).toBeDefined();
  });

  it("blocks unauthenticated access to seller dashboard (returns 401/503 depending on Supabase config)", async () => {
    const res = await request(app).get("/api/seller/dashboard");
    expect([401, 503]).toContain(res.status);
    expect(res.body.error).toBeDefined();
  });

  it("blocks unauthenticated access to admin dashboard (returns 401/503 depending on Supabase config)", async () => {
    const res = await request(app).get("/api/admin/dashboard");
    expect([401, 503]).toContain(res.status);
    expect(res.body.error).toBeDefined();
  });

  it("rejects unauthorized access when an invalid token is provided", async () => {
    const res = await request(app)
      .get("/api/admin/dashboard")
      .set("Authorization", "Bearer forged.jwt.token");
    expect([401, 503]).toContain(res.status);
    expect(res.body.error).toBeDefined();
  });

  it("enforces Helmet security headers across all endpoints", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.headers["x-dns-prefetch-control"]).toBe("off");
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(res.headers["strict-transport-security"]).toBeDefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("does not expose internal stack traces on unknown API routes", async () => {
    const res = await request(app).get("/api/non-existent-endpoint-xyz");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Endpoint not found.");
    expect(res.body.stack).toBeUndefined();
  });

  it("sanitizes public product catalog by ensuring seller personal contact info is omitted", async () => {
    const res = await request(app).get("/api/catalog/products");
    expect(res.status).toBe(200);
    if (res.body.items && res.body.items.length > 0) {
      for (const item of res.body.items) {
        expect(item.seller_phone).toBeUndefined();
        expect(item.seller_email).toBeUndefined();
        expect(item.seller_bank_details).toBeUndefined();
      }
    }
  });
});
