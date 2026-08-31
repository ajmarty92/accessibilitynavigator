import fs from "node:fs";
import path from "node:path";
import { Scraper, type Tweet as RawTweet } from "agent-twitter-client";
import { config } from "../config";

export interface TweetLink {
  url: string;
  expandedUrl: string;
  displayUrl: string;
}

export interface NormalizedTweet {
  id: string;
  text: string;
  createdAt: Date;
  tweetUrl: string;
  mediaUrls: string[];
  links: TweetLink[];
  isRetweet: boolean;
  isReply: boolean;
}

export interface ResolvedProfile {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
}

const scraper = new Scraper();
let loginPromise: Promise<void> | null = null;

/**
 * Makes sure `scraper` holds a valid, logged-in session.
 * Reuses cookies cached on disk when possible so we don't hit X's login
 * flow (and its bot-detection heuristics) on every process start / request.
 */
async function ensureAuthenticated(): Promise<void> {
  // Coalesce concurrent callers into a single login attempt.
  if (loginPromise) return loginPromise;

  loginPromise = (async () => {
    if (await tryLoadCachedCookies()) {
      if (await scraper.isLoggedIn()) {
        console.log("[scraper] Reusing cached session cookies.");
        return;
      }
      console.log("[scraper] Cached cookies are no longer valid, logging in again.");
    }

    console.log(`[scraper] Logging in as @${config.twitterUsername}...`);
    await scraper.login(config.twitterUsername, config.twitterPassword, config.twitterEmail);

    if (!(await scraper.isLoggedIn())) {
      throw new Error("Login to X/Twitter failed (isLoggedIn() returned false after login()).");
    }

    await persistCookies();
    console.log("[scraper] Login successful, cookies cached to disk.");
  })();

  try {
    await loginPromise;
  } catch (err) {
    // Allow a retry on the next call instead of permanently failing.
    loginPromise = null;
    throw err;
  }

  return loginPromise;
}

async function tryLoadCachedCookies(): Promise<boolean> {
  try {
    if (!fs.existsSync(config.cookieCachePath)) return false;
    const raw = fs.readFileSync(config.cookieCachePath, "utf-8");
    const cookies: string[] = JSON.parse(raw);
    if (!Array.isArray(cookies) || cookies.length === 0) return false;
    await scraper.setCookies(cookies);
    return true;
  } catch (err) {
    console.warn("[scraper] Failed to load cached cookies, will log in fresh.", err);
    return false;
  }
}

async function persistCookies(): Promise<void> {
  try {
    const cookies = await scraper.getCookies();
    const serializable = cookies.map((c) => c.toString());
    const dir = path.dirname(config.cookieCachePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(config.cookieCachePath, JSON.stringify(serializable, null, 2));
  } catch (err) {
    console.warn("[scraper] Failed to persist cookies to disk.", err);
  }
}

/**
 * Resolves a handle's public profile (display name + avatar).
 * Returns `null` if the handle doesn't exist / can't be resolved.
 */
export async function resolveProfile(handle: string): Promise<ResolvedProfile | null> {
  await ensureAuthenticated();
  try {
    const profile = await scraper.getProfile(handle);
    if (!profile || !profile.username) return null;
    return {
      handle: profile.username,
      displayName: profile.name || profile.username,
      avatarUrl: profile.avatar ?? null,
    };
  } catch (err) {
    console.warn(`[scraper] getProfile(${handle}) failed:`, (err as Error).message);
    return null;
  }
}

/**
 * Fetches recent tweets for `handle`, newest-first as returned by X,
 * capped at `limit`. Callers diff against their own `lastSeenTweetId`.
 */
export async function fetchRecentTweets(handle: string, limit = 40): Promise<NormalizedTweet[]> {
  await ensureAuthenticated();
  const results: NormalizedTweet[] = [];
  try {
    for await (const raw of scraper.getTweets(handle, limit)) {
      const normalized = normalizeTweet(raw, handle);
      if (normalized) results.push(normalized);
      if (results.length >= limit) break;
    }
  } catch (err) {
    console.warn(`[scraper] fetchRecentTweets(${handle}) failed:`, (err as Error).message);
  }
  return results;
}

/** Fetches a single tweet by ID directly (used as a fallback / spot-check; not on the hot poll path). */
export async function fetchTweetById(id: string, handle: string): Promise<NormalizedTweet | null> {
  await ensureAuthenticated();
  try {
    const raw = await scraper.getTweet(id);
    if (!raw) return null;
    return normalizeTweet(raw, handle);
  } catch (err) {
    console.warn(`[scraper] getTweet(${id}) failed:`, (err as Error).message);
    return null;
  }
}

function normalizeTweet(raw: RawTweet, trackedHandle: string): NormalizedTweet | null {
  if (!raw.id) return null;

  const isRetweet = !!raw.isRetweet;
  // For retweets, prefer the original tweet's own parsed data (full text,
  // its own media/links) rather than the outer wrapper, which X truncates.
  const source = isRetweet && raw.retweetedStatus ? raw.retweetedStatus : raw;

  const text = source.text ?? raw.text ?? "";
  const createdAt = raw.timeParsed ?? (raw.timestamp ? new Date(raw.timestamp * 1000) : new Date());
  const mediaUrls = (source.photos ?? []).map((p) => p.url).filter(Boolean);
  const links = extractLinks(text, source.urls ?? []);

  return {
    id: raw.id,
    text,
    createdAt,
    tweetUrl: `https://x.com/${trackedHandle}/status/${raw.id}`,
    mediaUrls,
    links,
    isRetweet,
    isReply: !!raw.isReply,
  };
}

const T_CO_REGEX = /https?:\/\/t\.co\/\w+/g;

/**
 * Pairs t.co short links found in the tweet text with their expanded
 * counterparts. agent-twitter-client's `Tweet.urls` is a flat array of
 * already-expanded URLs in text order when entities were parsed
 * successfully; when that's unavailable (or counts don't line up) we fall
 * back to url === expandedUrl === displayUrl for that link.
 */
export function extractLinks(text: string, expandedUrls: string[]): TweetLink[] {
  const shortLinks = text.match(T_CO_REGEX) ?? [];
  if (shortLinks.length === 0) return [];

  const canPair = expandedUrls.length === shortLinks.length;

  return shortLinks.map((shortUrl, i) => {
    const expandedUrl = canPair ? expandedUrls[i] : shortUrl;
    return {
      url: shortUrl,
      expandedUrl,
      displayUrl: toDisplayUrl(expandedUrl),
    };
  });
}

function toDisplayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    let display = parsed.hostname.replace(/^www\./, "") + parsed.pathname + parsed.search;
    display = display.replace(/\/$/, "");
    if (display.length > 30) display = `${display.slice(0, 27)}...`;
    return display;
  } catch {
    return url;
  }
}
