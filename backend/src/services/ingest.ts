import type { TrackedAccount } from "@prisma/client";
import { prisma } from "../db/client";
import { fetchRecentTweets, type NormalizedTweet } from "./scraper";
import { pushNewTweet } from "./fcm";

// How many recent tweets to pull per account per poll. Generous enough to
// cover a burst of activity within one POLL_INTERVAL_MS window for a small
// personal watchlist, without hammering X on every cycle.
const FETCH_LIMIT = 40;

/**
 * Splits a newest-first batch of fetched tweets into the subset that is
 * new relative to `lastSeenTweetId`, returned oldest-first (the order the
 * caller should persist + notify in).
 *
 * - `lastSeenTweetId === null` (never polled before): everything fetched
 *   counts as "new" — callers seeding a freshly-tracked account pass
 *   `notify: false` so this doesn't blast a wall of push notifications.
 * - If `lastSeenTweetId` isn't found in the fetched batch at all (more
 *   tweets were posted since the last poll than `FETCH_LIMIT` covers), we
 *   fall back to treating the whole fetched batch as new and log a warning
 *   — a small gap is possible but acceptable for a personal tool.
 */
export function splitNewTweets(
  fetched: NormalizedTweet[],
  lastSeenTweetId: string | null
): NormalizedTweet[] {
  if (!lastSeenTweetId) return [...fetched].reverse();
  const idx = fetched.findIndex((t) => t.id === lastSeenTweetId);
  const newOnes = idx === -1 ? fetched : fetched.slice(0, idx);
  return [...newOnes].reverse();
}

/**
 * Polls one account: fetches recent tweets, persists any new ones
 * (oldest-first), advances lastSeenTweetId, and — when `notify` is true —
 * sends one FCM push per new tweet (oldest first).
 */
export async function pollAccount(
  account: TrackedAccount,
  opts: { notify: boolean }
): Promise<number> {
  const fetched = await fetchRecentTweets(account.handle, FETCH_LIMIT);
  if (fetched.length === 0) return 0;

  const newTweets = splitNewTweets(fetched, account.lastSeenTweetId);
  if (newTweets.length === 0) return 0;

  const lastSeenIdx = account.lastSeenTweetId
    ? fetched.findIndex((t) => t.id === account.lastSeenTweetId)
    : -1;
  if (account.lastSeenTweetId && lastSeenIdx === -1) {
    console.warn(
      `[poller] @${account.handle}: lastSeenTweetId not found in the last ${fetched.length} tweets — ` +
        `there may be a gap (more tweets posted than FETCH_LIMIT covers).`
    );
  }

  for (const t of newTweets) {
    const row = await prisma.tweet.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        accountHandle: account.handle,
        text: t.text,
        createdAt: t.createdAt,
        tweetUrl: t.tweetUrl,
        mediaUrls: JSON.stringify(t.mediaUrls),
        links: JSON.stringify(t.links),
        isRetweet: t.isRetweet,
        isReply: t.isReply,
      },
    });

    if (opts.notify) {
      await pushNewTweet(
        row,
        { displayName: account.displayName, avatarUrl: account.avatarUrl },
        t.mediaUrls[0]
      );
    }
  }

  const newestId = newTweets[newTweets.length - 1].id;
  await prisma.trackedAccount.update({
    where: { handle: account.handle },
    data: { lastSeenTweetId: newestId },
  });

  return newTweets.length;
}
