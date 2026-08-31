import express from "express";
import { config } from "./config";
import { requireApiKey } from "./middleware/auth";
import { devicesRouter } from "./routes/devices";
import { accountsRouter } from "./routes/accounts";
import { tweetsRouter } from "./routes/tweets";
import { startPoller } from "./poller";
import { prisma } from "./db/client";

const app = express();
app.use(express.json());

// Basic request log — console is fine for a 2-user personal tool.
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Unauthenticated health check for uptime monitoring / container healthchecks.
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const api = express.Router();
api.use(requireApiKey);
api.use(devicesRouter);
api.use(accountsRouter);
api.use(tweetsRouter);
app.use("/api/v1", api);

// Fallback error handler so a thrown error in a route becomes a 500
// instead of an unhandled exception / hung request.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[http] Unhandled route error:", err);
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(config.port, () => {
  console.log(`[http] Listening on port ${config.port}`);
  startPoller();
});

async function shutdown(signal: string) {
  console.log(`[app] Received ${signal}, shutting down...`);
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
