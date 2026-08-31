import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  apiKey: requireEnv("API_KEY"),

  // agent-twitter-client login credentials (use a dedicated/burner account —
  // see README.md for why).
  twitterUsername: requireEnv("TWITTER_USERNAME"),
  twitterPassword: requireEnv("TWITTER_PASSWORD"),
  twitterEmail: process.env.TWITTER_EMAIL,

  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 300_000),

  firebaseServiceAccountPath: requireEnv("FIREBASE_SERVICE_ACCOUNT_PATH"),

  // Where the scraper caches its authenticated session cookies, so it
  // doesn't have to re-login on every process start (re-logins are a big
  // bot-detection trigger on X).
  cookieCachePath: process.env.COOKIE_CACHE_PATH ?? "./data/twitter-cookies.json",

  // Max chars for tweet `text` inside the FCM data payload (kept well under
  // FCM's 4KB total data-payload limit). Full text is always in the DB.
  fcmTextTruncateLength: Number(process.env.FCM_TEXT_TRUNCATE_LENGTH ?? 500),
};
