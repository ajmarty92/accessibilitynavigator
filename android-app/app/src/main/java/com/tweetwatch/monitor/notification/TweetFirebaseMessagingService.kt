package com.tweetwatch.monitor.notification

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.tweetwatch.monitor.domain.model.Tweet
import com.tweetwatch.monitor.domain.model.TweetLink
import com.tweetwatch.monitor.domain.usecase.SyncFcmTokenUseCase
import com.tweetwatch.monitor.domain.usecase.UpsertPushedTweetUseCase
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.time.Instant
import javax.inject.Inject

private const val TYPE_NEW_TWEET = "new_tweet"

/**
 * FCM payloads are always data-only (no `notification` block) per the
 * contract, so this service is solely responsible for building the visible
 * notification — in every app state, since a data message with
 * android.priority=high wakes this service even when the app is
 * backgrounded or killed.
 *
 * Unlike BroadcastReceiver.onReceive(), FirebaseMessagingService's callbacks
 * don't get torn down the instant they return — there's no goAsync()
 * equivalent here (it doesn't exist on Service, only on BroadcastReceiver)
 * because none is needed: the FCM SDK keeps this service instance alive for
 * its own dispatch. Work is still kept on serviceScope (IO dispatcher) so it
 * never runs on the main thread; both operations below (a local DB upsert
 * and building/posting a notification) are fast, so no WorkManager hand-off
 * is warranted.
 */
@AndroidEntryPoint
class TweetFirebaseMessagingService : FirebaseMessagingService() {

    @Inject lateinit var upsertPushedTweetUseCase: UpsertPushedTweetUseCase
    @Inject lateinit var syncFcmTokenUseCase: SyncFcmTokenUseCase
    @Inject lateinit var notificationHelper: NotificationHelper

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onNewToken(token: String) {
        serviceScope.launch {
            runCatching { syncFcmTokenUseCase.onNewToken(token) }
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val data = message.data
        if (data["type"] != TYPE_NEW_TWEET) return

        val payload = data.toPushTweetPayloadOrNull() ?: return

        serviceScope.launch {
            runCatching {
                upsertPushedTweetUseCase(payload.toDomainTweet())
                notificationHelper.showNewTweetNotification(payload)
            }
        }
    }

    private fun Map<String, String>.toPushTweetPayloadOrNull(): PushTweetPayload? {
        val tweetId = this["tweetId"] ?: return null
        val accountHandle = this["accountHandle"] ?: return null
        val accountDisplayName = this["accountDisplayName"] ?: return null
        // Optional per the contract — the backend omits it entirely when the
        // account has no resolvable avatar. Must NOT be treated as required:
        // doing so previously dropped the whole push (no notification, no
        // local cache insert) for any account without an avatar.
        val accountAvatarUrl = this["accountAvatarUrl"]
        val text = this["text"] ?: return null
        val tweetUrl = this["tweetUrl"] ?: return null
        val createdAt = this["createdAt"] ?: return null

        return PushTweetPayload(
            tweetId = tweetId,
            accountHandle = accountHandle,
            accountDisplayName = accountDisplayName,
            accountAvatarUrl = accountAvatarUrl,
            text = text,
            tweetUrl = tweetUrl,
            mediaUrl = this["mediaUrl"],
            createdAt = createdAt
        )
    }

    private fun PushTweetPayload.toDomainTweet(): Tweet = Tweet(
        id = tweetId,
        accountHandle = accountHandle,
        accountDisplayName = accountDisplayName,
        accountAvatarUrl = accountAvatarUrl,
        text = text,
        createdAt = runCatching { Instant.parse(createdAt) }.getOrDefault(Instant.now()),
        tweetUrl = tweetUrl,
        mediaUrls = mediaUrl?.let { listOf(it) } ?: emptyList(),
        links = emptyList<TweetLink>(),
        isRetweet = false,
        isReply = false,
        // The FCM payload's text may be truncated to ~500 chars (contract);
        // flag it so TweetDetailViewModel backfills via GET /tweets/{id}.
        isPartial = true
    )
}
