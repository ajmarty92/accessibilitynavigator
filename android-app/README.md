# TweetWatch (Android)

A small, personal Android app for two people to follow a hand-picked list of
X/Twitter accounts without opening X: the app is notified by push when a
tracked account posts, and the full tweet — text, image, links — is readable
right in the app. It never talks to X/Twitter directly and needs no X login;
all data comes from the companion backend in `/backend`, over the REST +
FCM contract in `/docs/twitter-monitor-contract.md`.

Read-only by design: there's no liking, replying, or retweeting. You can view
the feed and tap links (including "open the real tweet on X").

## Architecture

- **Kotlin + Jetpack Compose only** — no XML layouts.
- **Clean Architecture**: `ui` (Compose screens + ViewModels) → `domain`
  (models, repository interfaces, use cases — no Android/Retrofit/Room
  imports) → `data` (Retrofit/OkHttp, Room, EncryptedSharedPreferences/
  DataStore, mappers, repository implementations). Events flow down from
  Compose to ViewModels; state flows back up as `StateFlow`.
- **Coroutines + StateFlow** everywhere for async/reactive state; nothing
  blocks the main thread.
- **Hilt** for DI, **Retrofit** (+ kotlinx.serialization) for networking,
  **Room** for the offline-first local tweet cache, **Coil** for images,
  **Chrome Custom Tabs** for all outbound links (no in-app browser).
- Single **dark-only** Material3 theme (`ui/theme`) — applied
  unconditionally; there is no light theme.
- Package: `com.tweetwatch.monitor`. `minSdk 26`, `compileSdk`/`targetSdk 35`.

See `app/src/main/java/com/tweetwatch/monitor/` for the full layer
breakdown (`ui/`, `domain/`, `data/`, `di/`, `notification/`).

## Prerequisites

- Android Studio (Ladybug or newer) or a standalone JDK 17 + Android SDK
  (`compileSdk 35`) for command-line builds.
- A Firebase project (for push notifications) — see below.
- The backend from `/backend` running somewhere reachable from the phone,
  with its `X-API-Key` value.

## 1. Firebase setup (required before building)

This repo intentionally does **not** include a `google-services.json` — it's
gitignored and must never be committed (see `app/.gitignore` /
`app/google-services.json.SAMPLE`).

1. Create a Firebase project at https://console.firebase.google.com.
2. Add an Android app to it with application ID `com.tweetwatch.monitor`
   (or whatever you changed `applicationId` to in `app/build.gradle.kts`).
3. Cloud Messaging is enabled by default — no extra setup needed there.
4. Download the generated `google-services.json` and place it at
   `android-app/app/google-services.json`.
5. On the backend side, generate a Firebase service-account key for the same
   project so the backend can send FCM pushes (see `/backend`'s own docs).

Until `google-services.json` is present, the Gradle build itself still
configures fine (the `google-services` Gradle plugin is only applied when the
file exists — see `app/build.gradle.kts`), but Firebase Messaging will fail
at runtime.

## 2. Configure the backend connection (first launch, in-app)

The backend base URL and the shared `X-API-Key` are **never** hardcoded — you
enter them once on the device, and they're stored locally in
`EncryptedSharedPreferences` (see `data/settings/SettingsRepositoryImpl.kt`).

1. Launch the app → **Settings** tab.
2. Enter the backend's base URL (just scheme + host, e.g.
   `https://your-server.example.com` — no trailing path, no `/api/v1`).
3. Enter the `X-API-Key` value the backend was started with.
4. Tap **Save**. The app then fetches the tracked-account list and starts
   syncing the feed. If a device push token arrived before you saved
   settings, it's queued locally and registered automatically right after
   you save (see `domain/usecase/SyncFcmTokenUseCase.kt`).
5. Add/remove tracked accounts from that same screen (`GET/POST/DELETE
   /accounts`) — it's the only management UI in the app; everything else is
   read-only viewing.

## 3. Build & run

**Android Studio**: Open `android-app/` as a project, let Gradle sync, then
Run on a device/emulator (API 26+; a Pixel running a recent Android release
is the primary target for the notification features).

**Command line**:

```bash
cd android-app
./gradlew assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk
```

Use `./gradlew build` to also run lint + unit tests, or `./gradlew
installDebug` to build and install onto a connected device/emulator in one
step.

## Notes on notifications

FCM messages from the backend are **data-only** (no `notification` block),
so the app itself builds the visible notification in every app state
(foreground, background, or killed) via `TweetFirebaseMessagingService` +
`NotificationHelper`:

- `BigPictureStyle` with the tweet's image as the big picture (and the
  account avatar as the small large-icon) when `mediaUrl` is present;
  `BigTextStyle` with the tweet text otherwise.
- A single `IMPORTANCE_HIGH` notification channel ("New tweets").
- Tapping the notification body deep-links straight into that tweet's detail
  screen (`tweetwatch://tweet/{tweetId}`); a secondary **"Open on X"** action
  jumps directly to the tweet on the web via Chrome Custom Tabs.
- The tweet is written into the local Room cache immediately from the push
  payload so it's viewable offline right away; because the backend may
  truncate `text` to ~500 chars in the push payload, the detail screen
  transparently fetches the full tweet via `GET /tweets/{id}` the first time
  it's opened if needed.

On Android 13+, the app requests the `POST_NOTIFICATIONS` runtime permission
on first launch; if it's denied, pushed tweets still land in the local cache
and are visible in the Feed tab, just without a tray notification.
