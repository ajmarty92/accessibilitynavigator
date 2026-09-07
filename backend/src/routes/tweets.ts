import { Router } from "express";
import { prisma } from "../db/client";
import { getAccountInfoMap, serializeTweet } from "../services/tweetSerializer";

export const tweetsRouter = Router();

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// GET /tweets?limit=50&before={tweetId} — paginated feed, newest first,
// across all currently tracked accounts.
tweetsRouter.get("/tweets", async (req, res) => {
  let limit = DEFAULT_LIMIT;
  if (typeof req.query.limit === "string") {
    const parsed = Number.parseInt(req.query.limit, 10);
    if (Number.isFinite(parsed) && parsed > 0) limit = Math.min(parsed, MAX_LIMIT);
  }

  let cursorCreatedAt: Date | null = null;
  let cursorId: string | null = null;
  const before = req.query.before;
  if (typeof before === "string" && before.trim()) {
    const cursorTweet = await prisma.tweet.findUnique({ where: { id: before } });
    if (cursorTweet) {
      cursorCreatedAt = cursorTweet.createdAt;
      cursorId = cursorTweet.id;
    }
    // If the cursor tweet id is unknown, silently fall back to the first
    // page rather than erroring — keeps infinite-scroll resilient to a
    // stale/pruned cursor on the client.
  }

  const trackedAccounts = await prisma.trackedAccount.findMany({
    where: { isTracked: true },
    select: { handle: true },
  });
  const trackedHandles = trackedAccounts.map((a) => a.handle);

  if (trackedHandles.length === 0) {
    res.json({ tweets: [], hasMore: false });
    return;
  }

  const where = {
    accountHandle: { in: trackedHandles },
    ...(cursorCreatedAt
      ? {
          OR: [
            { createdAt: { lt: cursorCreatedAt } },
            { createdAt: cursorCreatedAt, id: { lt: cursorId! } },
          ],
        }
      : {}),
  };

  const rows = await prisma.tweet.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);

  const accountInfo = await getAccountInfoMap(page.map((t) => t.accountHandle));
  const tweets = page.map((t) => serializeTweet(t, accountInfo.get(t.accountHandle)));

  res.json({ tweets, hasMore });
});

// GET /tweets/:id — fetch a single tweet by ID (any account, tracked or not).
tweetsRouter.get("/tweets/:id", async (req, res) => {
  const tweet = await prisma.tweet.findUnique({ where: { id: req.params.id } });
  if (!tweet) {
    res.status(404).json({ error: "Tweet not found" });
    return;
  }
  const accountInfo = await getAccountInfoMap([tweet.accountHandle]);
  res.json(serializeTweet(tweet, accountInfo.get(tweet.accountHandle)));
});
