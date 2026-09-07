package com.tweetwatch.monitor.notification

/** Parsed form of the FCM data-only payload, per docs/twitter-monitor-contract.md. */
data class PushTweetPayload(
    val tweetId: String,
    val accountHandle: String,
    val accountDisplayName: String,
    val accountAvatarUrl: String?,
    val text: String,
    val tweetUrl: String,
    val mediaUrl: String?,
    val createdAt: String
)
