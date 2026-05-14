import type { Express, Request, Response, NextFunction } from "express";
import { ENV } from "./env";

const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, "");
}

function getAllowedOrigins() {
  return new Set(
    [
      ENV.appOrigin,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ]
      .filter(Boolean)
      .map(normalizeOrigin)
  );
}

function isAllowedOrigin(origin: string) {
  const normalizedOrigin = normalizeOrigin(origin);
  if (getAllowedOrigins().has(normalizedOrigin)) return true;
  return !ENV.isProduction && localOriginPattern.test(normalizedOrigin);
}

export function registerCors(app: Express) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    if (origin && isAllowedOrigin(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Vary", "Origin");
    }

    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] ?? "Content-Type, Authorization"
    );

    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }

    next();
  });
}
