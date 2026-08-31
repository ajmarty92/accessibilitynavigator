# Twitter Monitor: Backend <-> Android API Contract

Personal-use system: a backend service scrapes X (Twitter) for a small,
user-managed list of accounts and pushes new posts to a native Android app
via Firebase Cloud Messaging (FCM). No X/Twitter login is required on the
Android side — all data comes from our own backend.

This is the single source of truth both the backend and Android codebases
are built against. Keep it in sync if either side changes.

## Auth

All REST calls require header: `X-API-Key: <shared secret>`
(single shared secret, since this is for ~2 personal users; set via env var
on the backend and entered once in the Android app's settings screen).

## Data model: Tweet (JSON)

```jsonc
{
  "id": "1234567890123456789",        // tweet ID (string, not int — overflows 32-bit/53-bit)
  "accountHandle": "someuser",         // without @
  "accountDisplayName": "Some User",
  "accountAvatarUrl": "https://pbs.twimg.com/profile_images/....jpg",
  "text": "Full tweet text, unshortened where possible",
  "createdAt": "2026-08-31T14:23:00Z", // ISO-8601 UTC
  "tweetUrl": "https://x.com/someuser/status/1234567890123456789",
  "mediaUrls": ["https://pbs.twimg.com/media/....jpg"],  // images only, may be empty
  "links": [                            // links found in the tweet text, for clickable chips
    { "url": "https://t.co/abc123", "expandedUrl": "https://example.com/article", "displayUrl": "example.com/article" }
  ],
  "isRetweet": false,
  "isReply": false
}
```

## REST Endpoints

Base path: `/api/v1`

### `POST /devices`
Register (or refresh) a device's FCM token.
Request: `{ "fcmToken": "string", "platform": "android" }`
Response: `204`

### `DELETE /devices/{fcmToken}`
Unregister a device (e.g. on logout/uninstall detection).
Response: `204`

### `GET /accounts`
List tracked accounts.
Response: `[{ "handle": "someuser", "displayName": "Some User", "avatarUrl": "https://..." }]`

### `POST /accounts`
Add a tracked account. Backend resolves the handle's profile via scraping.
Request: `{ "handle": "someuser" }`
Response: `201` with the resolved account object, or `404` if handle doesn't exist.

### `DELETE /accounts/{handle}`
Stop tracking an account (existing cached tweets remain).
Response: `204`

### `GET /tweets?limit=50&before={tweetId}`
Paginated feed across all tracked accounts, newest first.
`before` (optional) = return tweets older than this tweet ID, for infinite scroll.
Response: `{ "tweets": [Tweet, ...], "hasMore": true }`

### `GET /tweets/{id}`
Fetch a single tweet by ID (used when a notification is tapped and the local
cache doesn't have it yet, e.g. app was force-updated/cleared).
Response: `Tweet` or `404`

## FCM Push Payload

Sent as a **data-only message** (no `notification` block) so the Android app
always builds the rich notification itself (BigPictureStyle when media is
present, expanded BigTextStyle otherwise) even when backgrounded/killed.

```jsonc
{
  "data": {
    "type": "new_tweet",
    "tweetId": "1234567890123456789",
    "accountHandle": "someuser",
    "accountDisplayName": "Some User",
    "accountAvatarUrl": "https://...",
    "text": "Full tweet text (may be truncated by backend to ~500 chars to stay under FCM's 4KB payload limit; full text always available via GET /tweets/{id})",
    "tweetUrl": "https://x.com/someuser/status/...",
    "mediaUrl": "https://... (first image only, may be absent)",
    "createdAt": "2026-08-31T14:23:00Z"
  },
  "android": { "priority": "high" }
}
```

Android resolves the full `Tweet` from its local Room cache (synced via
`GET /tweets`) using `tweetId`; the notification itself is built directly
from the payload for speed, and tapping it deep-links to that tweet in-app.

## Polling / delivery expectations

- Backend polls each tracked account on an interval (default 5 minutes,
  configurable) and diffs against the last-seen tweet ID per account.
- New tweets (newest-first) trigger one FCM push per tweet, oldest of the
  batch first, to registered devices.
- Retweets and replies ARE included (flagged via `isRetweet`/`isReply`) —
  the app/backend do not filter them; if the user wants filtering later,
  it's a backend-side toggle per account.
