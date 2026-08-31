import { config } from "./config";
import { prisma } from "./db/client";
import { pollAccount } from "./services/ingest";

let running = false;
let timer: NodeJS.Timeout | null = null;

async function pollOnce(): Promise<void> {
  if (running) {
    console.warn("[poller] Previous poll cycle still running, skipping this tick.");
    return;
  }
  running = true;
  try {
    const accounts = await prisma.trackedAccount.findMany({ where: { isTracked: true } });
    if (accounts.length === 0) return;

    console.log(`[poller] Polling ${accounts.length} tracked account(s)...`);
    for (const account of accounts) {
      try {
        const count = await pollAccount(account, { notify: true });
        if (count > 0) {
          console.log(`[poller] @${account.handle}: ${count} new tweet(s).`);
        }
      } catch (err) {
        // One account failing (rate limit, transient network issue, X
        // layout change) should never take down polling for the rest.
        console.error(`[poller] Failed to poll @${account.handle}:`, err);
      }
    }
  } catch (err) {
    console.error("[poller] Poll cycle failed:", err);
  } finally {
    running = false;
  }
}

/** Starts the background polling loop. Fires once immediately, then every POLL_INTERVAL_MS. */
export function startPoller(): void {
  console.log(`[poller] Starting, interval = ${config.pollIntervalMs}ms`);
  void pollOnce();
  timer = setInterval(() => void pollOnce(), config.pollIntervalMs);
}

export function stopPoller(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
