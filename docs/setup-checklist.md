# Setup checklist: Twitter/X Monitor

Everything in code is done and CI-verified (see PR #31). Everything left in
this checklist needs your own accounts/hardware — none of it can be done
from inside the coding session. Work through it top to bottom.

## Step 1 — Get a burner X account

Create a new X/Twitter account you don't care about losing. **Do not use
your or your brother's main account** — `backend/README.md` explains why in
detail, but short version: this backend logs in like a human, X can detect
and ban that, and a burner costs you nothing if it happens.

Once created, note down:
- Username
- Password
- Email (only needed if X prompts for email verification on login from a
  new device/location — likely on a fresh account)

Open `backend/.env` (already created, gitignored) and fill in:
```
TWITTER_USERNAME=
TWITTER_PASSWORD=
TWITTER_EMAIL=
```

## Step 2 — Create a Firebase project (free)

1. Go to the [Firebase console](https://console.firebase.google.com) and
   create a new project (any name).
2. Add an **Android app** to it. Use package name `com.tweetwatch.monitor`
   (matches `android-app/app/build.gradle.kts` — only change this if you
   also change `applicationId` there).
3. Download the generated `google-services.json` and place it at:
   `android-app/app/google-services.json`
   (this file is gitignored — never commit it).
4. In Firebase console → Project Settings → **Service accounts** → "Generate
   new private key". This downloads a second JSON file — this one is for the
   *backend*, not the app.
5. Copy that file into `backend/data/firebase-service-account.json`
   (create the `data/` folder if it doesn't exist — `mkdir -p backend/data`).
   `backend/.env`'s `FIREBASE_SERVICE_ACCOUNT_PATH` already points here.

Cloud Messaging itself needs no extra setup — it's on by default.

## Step 3 — Run the backend somewhere it stays on

This needs to run continuously (it polls every 5 minutes), so pick one:
a Raspberry Pi, an old laptop, a cheap VPS (DigitalOcean/Linode droplet,
etc.), or even a machine that's just left on at home.

```bash
cd backend
mkdir -p data
# .env is already sitting here, pre-filled with a generated API_KEY —
# just make sure you've filled in TWITTER_USERNAME/PASSWORD/EMAIL (Step 1)
# and dropped the Firebase service account JSON into data/ (Step 2) first.
docker compose up -d --build
```

Check it's alive:
```bash
curl -H "X-API-Key: <the API_KEY value from .env>" http://<host>:3000/api/v1/accounts
# should return: []
```

If it's not reachable from your phone's network, either put it on a network
your phone can reach (same LAN, or a Tailscale/VPN setup), or expose it via
a reverse proxy with HTTPS — either works, but plan for it before Step 5.

## Step 4 — Build and install the Android app

With `google-services.json` in place from Step 2:

```bash
cd android-app
./gradlew assembleDebug
```

APK lands at `android-app/app/build/outputs/apk/debug/app-debug.apk`.
Install it on the Pixel (via `adb install`, or Android Studio's Run button,
or just copying the APK over and opening it — you'll need to allow installs
from unknown sources for a sideloaded debug build).

On first launch, go to the **Settings** tab and enter:
- **Backend URL**: wherever Step 3's server is reachable, e.g.
  `http://192.168.1.50:3000` or `https://your-domain.example`
- **API key**: the `API_KEY` value from `backend/.env`

Grant the notification permission when prompted (Android 13+).

## Step 5 — Add a tracked account and verify end-to-end

In the app's Settings screen, add a handle (without the `@`). You should see
it appear in the list within a few seconds (the backend resolves the
profile immediately on add).

Then verify the full loop:
1. Wait for that account to post something new (or add an account you know
   posts often), up to one `POLL_INTERVAL_MS` cycle (5 min default).
2. Confirm a rich notification appears — avatar, name, text, image if the
   tweet had one.
3. Tap the notification → should deep-link into the app showing that tweet.
4. Tap "Open on X" on the notification → should open the real tweet via
   Chrome Custom Tabs.
5. If the tweet had a link in it, tap it in the app → should also open via
   Custom Tabs.

If a notification doesn't show up: check the backend logs
(`docker compose logs -f` from `backend/`) for poll/login errors first —
most issues at this stage are X login/session problems, not app bugs.

## Step 6 — Merge

Once Step 5 works, merge [PR #31](https://github.com/ajmarty92/accessibilitynavigator/pull/31).
