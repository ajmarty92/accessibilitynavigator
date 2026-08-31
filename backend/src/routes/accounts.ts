import { Router } from "express";
import { prisma } from "../db/client";
import { resolveProfile } from "../services/scraper";
import { pollAccount } from "../services/ingest";

export const accountsRouter = Router();

function normalizeHandle(input: string): string {
  return input.trim().replace(/^@/, "");
}

// GET /accounts — list currently tracked accounts.
accountsRouter.get("/accounts", async (_req, res) => {
  const accounts = await prisma.trackedAccount.findMany({
    where: { isTracked: true },
    orderBy: { createdAt: "asc" },
    select: { handle: true, displayName: true, avatarUrl: true },
  });
  res.json(accounts);
});

// POST /accounts — add a tracked account, resolving its profile via scraping.
accountsRouter.post("/accounts", async (req, res) => {
  const { handle } = req.body ?? {};
  if (typeof handle !== "string" || !handle.trim()) {
    res.status(400).json({ error: "handle (string) is required" });
    return;
  }

  const requested = normalizeHandle(handle);

  let profile;
  try {
    profile = await resolveProfile(requested);
  } catch (err) {
    console.error(`[accounts] Failed to resolve profile for @${requested}:`, err);
    res.status(502).json({ error: "Failed to reach X/Twitter to resolve this handle" });
    return;
  }

  if (!profile) {
    res.status(404).json({ error: `Handle @${requested} could not be found` });
    return;
  }

  const account = await prisma.trackedAccount.upsert({
    where: { handle: profile.handle },
    update: {
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      isTracked: true,
    },
    create: {
      handle: profile.handle,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    },
  });

  // Seed the account's recent tweets into the feed immediately so it isn't
  // empty until the next poll cycle, but without sending a push for each
  // (that would blast a wall of "new tweet" notifications for old posts).
  // Best-effort: the account is already added even if this fails.
  try {
    await pollAccount(account, { notify: false });
  } catch (err) {
    console.warn(`[accounts] Initial tweet seed for @${account.handle} failed:`, err);
  }

  res.status(201).json({
    handle: account.handle,
    displayName: account.displayName,
    avatarUrl: account.avatarUrl,
  });
});

// DELETE /accounts/:handle — stop tracking (cached tweets remain queryable).
accountsRouter.delete("/accounts/:handle", async (req, res) => {
  const handle = normalizeHandle(req.params.handle);
  await prisma.trackedAccount.updateMany({
    where: { handle },
    data: { isTracked: false },
  });
  res.status(204).end();
});
