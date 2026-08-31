# Twitter Monitor Backend

A small self-hosted backend that watches a handful of X/Twitter accounts and
pushes new posts to a native Android app via Firebase Cloud Messaging (FCM),
so you never have to open X/Twitter itself to see what those accounts posted.

Built for exactly one deployment: **you and your brother**, ~2 registered
devices, a handful of tracked accounts. It is intentionally simple — SQLite
on disk, a single Node process, a poll loop instead of a webhook/stream.

The REST API and FCM payload shapes are a fixed contract shared with the
Android app — see [`../docs/twitter-monitor-contract.md`](../docs/twitter-monitor-contract.md).
This backend implements that contract exactly; don't change field names or
response shapes here without updating that doc (and the Android side) too.

## Read this first: how tweets are actually fetched

**This uses an unofficial, reverse-engineered method to read X/Twitter — not
the official X API.** Specifically, it uses the
[`agent-twitter-client`](https://www.npmjs.com/package/agent-twitter-client)
npm package, which logs into X with a real username/password (like a human
using the site) and talks to X's internal web/GraphQL endpoints. This was a
deliberate choice to avoid the official API's read-access pricing
(~$200/month at the Basic tier as of 2026), which doesn't make sense for a
2-person hobby project.

Please understand what that trade-off actually means before you run this:

- **It violates X's Terms of Service.** Automating access to X outside their
  official API, especially by scripting a login, is against their rules.
  This is a personal, non-commercial tool, but that doesn't make it
  compliant — it just makes it low-stakes if it goes wrong.
- **X can detect and ban the login used.** X actively fingerprints and rate
  limits automated/unusual login and browsing patterns. The account used
  here can get temporarily locked, rate-limited, or permanently suspended
  with no warning and no appeal that's likely to succeed.
- **Use a dedicated/burner X account for `TWITTER_USERNAME`/`TWITTER_PASSWORD`
  — never your or your brother's main personal account.** If (when) X flags
  it, you lose a throwaway login, not your real account, DMs, followers, or
  identity tied to your name.
- **This will break.** `agent-twitter-client` works by reverse-engineering
  X's private web API, which X changes without notice and without a
  deprecation window. When it breaks, tweets stop coming in silently (check
  the logs — see "Troubleshooting" below) until someone updates the library
  or this code. Budget for occasional maintenance; this is not a
  "set it up once and forget it" system.
- The npm registry currently flags `agent-twitter-client` itself as
  deprecated/no-longer-supported upstream. It's still the most functional
  option available for this and is what was requested, but that's one more
  reason to expect it will eventually need to be patched, forked, or
  replaced.

If any of that is unacceptable, the honest alternative is paying for the
official X API's read tier instead of scraping.

## Stack

- **TypeScript** + **Express** for the REST API
- **Prisma** + **SQLite** for storage (single file on disk, no external DB)
- **`agent-twitter-client`** for scraping tweets/profiles from X
- **`firebase-admin`** for sending FCM push notifications
- A simple `setInterval` poll loop (no queue/worker infra needed at this scale)

## Project layout

```
src/
  routes/       Express routers: devices, accounts, tweets
  services/
    scraper.ts        agent-twitter-client wrapper: login, cookie cache,
                       profile resolution, tweet fetching + normalization
    fcm.ts             firebase-admin wrapper: sends the data-only FCM push
    ingest.ts          diffs fetched tweets against lastSeenTweetId,
                        persists new ones, triggers pushes
    tweetSerializer.ts DB row -> contract JSON shape
  middleware/
    auth.ts       X-API-Key header check
  db/
    client.ts     shared Prisma client
  poller.ts       background interval loop (calls ingest.pollAccount per account)
  index.ts        Express app wiring + startup
  config.ts       env var loading/validation
prisma/
  schema.prisma   TrackedAccount / Tweet / Device models
```

## Setup

Requires Node.js 18+.

```bash
cd backend
npm install
cp .env.example .env
# edit .env — see "Configuration" below
npx prisma migrate dev   # creates the SQLite DB + applies the schema
npm run dev               # runs with auto-reload (tsx watch)
```

### npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | Runs the server with `tsx watch` (auto-restarts on file changes) |
| `npm run build` | Type-checks and compiles to `dist/`, regenerates the Prisma client |
| `npm start` | Runs the compiled `dist/index.js` (production) |
| `npm run prisma:migrate` | Creates/applies a new migration in dev (`prisma migrate dev`) |
| `npm run prisma:migrate:deploy` | Applies existing migrations without prompting (used in Docker/prod) |
| `npm run prisma:studio` | Opens Prisma Studio, a GUI to browse/edit the SQLite DB |

### Configuration

All configuration is via environment variables — see `.env.example` for the
full list with comments. Summary:

| Var | Required | Meaning |
|---|---|---|
| `API_KEY` | yes | Shared secret the Android app sends as `X-API-Key` on every request |
| `PORT` | no (default `3000`) | HTTP port |
| `DATABASE_URL` | yes | SQLite file path, as a Prisma `file:` URL |
| `TWITTER_USERNAME` | yes | Login username for the scraping account (**use a burner** — see above) |
| `TWITTER_PASSWORD` | yes | Login password for that account |
| `TWITTER_EMAIL` | no | Login email, only needed if X prompts for email verification on login |
| `COOKIE_CACHE_PATH` | no (default `./data/twitter-cookies.json`) | Where the authenticated session is cached to disk |
| `POLL_INTERVAL_MS` | no (default `300000` = 5 min) | How often to check tracked accounts for new tweets |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | yes | Path to the Firebase service account JSON key (see below) |

## Setting up Firebase Cloud Messaging

1. Go to the [Firebase console](https://console.firebase.google.com/) and
   create a new project (free tier is enough).
2. Add an Android app to the project using the same applicationId/package
   name the Android app is built with, and download the `google-services.json`
   it gives you — that goes into the **Android** project, not here.
3. In the Firebase console: **Project settings → Service accounts → Generate
   new private key**. This downloads a JSON file — this is the credential
   this backend uses to *send* pushes.
4. Save that file somewhere the backend can read it (e.g.
   `backend/data/firebase-service-account.json`, which is already
   git-ignored) and point `FIREBASE_SERVICE_ACCOUNT_PATH` at it.
5. **Treat this file like a password** — anyone with it can send pushes as
   your Firebase project. Never commit it.

## Adding / removing tracked accounts

Once the server is running, manage the watchlist over the REST API using the
same `X-API-Key` the Android app uses:

```bash
export API_KEY=your-shared-secret
export BASE_URL=http://localhost:3000/api/v1

# List currently tracked accounts
curl -s -H "X-API-Key: $API_KEY" "$BASE_URL/accounts"

# Add an account to track (handle without the leading @)
curl -s -X POST -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"handle":"someuser"}' \
  "$BASE_URL/accounts"
# -> 201 with the resolved {handle, displayName, avatarUrl}, or 404 if the
#    handle doesn't exist. On success it also silently backfills a batch of
#    that account's recent tweets into the feed (no push notifications for
#    those — only genuinely new tweets from then on trigger a push).

# Stop tracking an account (its already-fetched tweets stay in the DB/feed)
curl -s -X DELETE -H "X-API-Key: $API_KEY" "$BASE_URL/accounts/someuser"

# Fetch the tweet feed (newest first)
curl -s -H "X-API-Key: $API_KEY" "$BASE_URL/tweets?limit=20"

# Register a device for push notifications (this is what the Android app
# calls on startup/token refresh — listed here mostly for debugging)
curl -s -X POST -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"fcmToken":"<token from the device>","platform":"android"}' \
  "$BASE_URL/devices"
```

## Running with Docker

```bash
cd backend
cp .env.example .env   # fill in real values
mkdir -p data
# drop your Firebase service account key at ./data/firebase-service-account.json
docker compose up -d --build
docker compose logs -f
```

`docker-compose.yml` bind-mounts `./data` into the container at `/app/data`
and points `DATABASE_URL`, `COOKIE_CACHE_PATH`, and
`FIREBASE_SERVICE_ACCOUNT_PATH` there, so the SQLite DB, the cached X login
session, and the Firebase key all survive container rebuilds/restarts. On
container start it automatically runs `prisma migrate deploy` before
starting the server.

This is small enough to run comfortably on a Raspberry Pi, a cheap VPS, or
any always-on machine on your home network. Whatever you use, make sure the
box has a stable outbound internet connection — the poller needs to reach
both X and Firebase on every cycle.

## Troubleshooting

- **New tweets never arrive / an account stops updating.** Check the logs
  for `[scraper]` or `[poller]` errors. The most likely cause is X having
  changed something `agent-twitter-client` relies on, or the login session
  having been flagged/locked. Try deleting the cached cookie file
  (`COOKIE_CACHE_PATH`) to force a fresh login, and check whether the burner
  account can still log into x.com normally in a browser.
- **`POST /accounts` returns 502.** The backend couldn't log into X or reach
  its API at all — check `TWITTER_USERNAME`/`TWITTER_PASSWORD`/`TWITTER_EMAIL`
  and the box's network connectivity.
- **`POST /accounts` returns 404.** The handle doesn't exist (or is
  suspended/deactivated) as far as the scraper can tell.
- **No push notifications, but tweets show up in `GET /tweets`.** Check that
  a device is registered (`POST /devices` was called) and that
  `FIREBASE_SERVICE_ACCOUNT_PATH` points at a valid service account key for
  the same Firebase project the Android app's `google-services.json` is
  from.
