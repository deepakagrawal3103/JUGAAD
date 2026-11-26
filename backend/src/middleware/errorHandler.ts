import type { NextFunction, Request, Response } from "express";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (process.env.NODE_ENV !== "production" && err instanceof Error) {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal server error." });
    return;
  }
  console.error("Unhandled server error");
  res.status(500).json({ error: "Internal server error." });
}
