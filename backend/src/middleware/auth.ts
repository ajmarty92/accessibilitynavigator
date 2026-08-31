import type { NextFunction, Request, Response } from "express";
import { config } from "../config";

/** Requires header `X-API-Key` to match the shared secret in env var API_KEY. */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const key = req.header("X-API-Key");
  if (!key || key !== config.apiKey) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
