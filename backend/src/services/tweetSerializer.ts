import type { Tweet as DbTweet, TrackedAccount } from "@prisma/client";
import { prisma } from "../db/client";

export interface ContractTweet {
  id: string;
  accountHandle: string;
  accountDisplayName: string;
  accountAvatarUrl: string | null;
  text: string;
  createdAt: string;
  tweetUrl: string;
  mediaUrls: string[];
  links: { url: string; expandedUrl: string; displayUrl: string }[];
  isRetweet: boolean;
  isReply: boolean;
}

type AccountInfo = Pick<TrackedAccount, "displayName" | "avatarUrl">;

/** Fetches {displayName, avatarUrl} for a set of handles in one query. */
export async function getAccountInfoMap(handles: string[]): Promise<Map<string, AccountInfo>> {
  const unique = [...new Set(handles)];
  if (unique.length === 0) return new Map();
  const accounts = await prisma.trackedAccount.findMany({
    where: { handle: { in: unique } },
    select: { handle: true, displayName: true, avatarUrl: true },
  });
  return new Map(accounts.map((a) => [a.handle, a]));
}

export function serializeTweet(tweet: DbTweet, account: AccountInfo | undefined): ContractTweet {
  return {
    id: tweet.id,
    accountHandle: tweet.accountHandle,
    accountDisplayName: account?.displayName ?? tweet.accountHandle,
    accountAvatarUrl: account?.avatarUrl ?? null,
    text: tweet.text,
    createdAt: tweet.createdAt.toISOString(),
    tweetUrl: tweet.tweetUrl,
    mediaUrls: safeParseArray(tweet.mediaUrls),
    links: safeParseArray(tweet.links),
    isRetweet: tweet.isRetweet,
    isReply: tweet.isReply,
  };
}

function safeParseArray(json: string): any[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
