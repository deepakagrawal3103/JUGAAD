import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "./auth.js";

const buckets = new Map<string, number[]>();

export function rateLimit(action: string, maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    const identity = authReq.auth?.userId || req.ip || "anon";
    const key = `${action}:${identity}`;
    const now = Date.now();
    const recent = (buckets.get(key) ?? []).filter((t) => t > now - windowMs);

    // Keep this process-local fallback bounded during anonymous traffic spikes.
    if (buckets.size > 10_000) {
      for (const [bucketKey, timestamps] of buckets) {
        if (!timestamps.some((timestamp) => timestamp > now - windowMs)) buckets.delete(bucketKey);
      }
    }

    if (recent.length >= maxRequests) {
      res.status(429).json({ error: "Rate limit exceeded. Please wait before retrying." });
      return;
    }

    recent.push(now);
    buckets.set(key, recent);
    next();
  };
}
