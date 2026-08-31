package com.tweetwatch.monitor.domain.model

import java.time.Instant

/**
 * Pure domain representation of a tweet, per the shared backend contract
 * (docs/twitter-monitor-contract.md). Layers above/below this map to/from it;
 * it has no Android, Retrofit, or Room dependencies.
 */
data class Tweet(
    val id: String,
    val accountHandle: String,
    val accountDisplayName: String,
    val accountAvatarUrl: String?,
    val text: String,
    val createdAt: Instant,
    val tweetUrl: String,
    val mediaUrls: List<String>,
    val links: List<TweetLink>,
    val isRetweet: Boolean,
    val isReply: Boolean,
    /**
     * True when this row came from an FCM push payload only (text may be
     * truncated to ~500 chars per the contract) and hasn't been backfilled
     * yet via GET /tweets/{id}.
     */
    val isPartial: Boolean = false
)

data class TweetLink(
    val url: String,
    val expandedUrl: String,
    val displayUrl: String
)
