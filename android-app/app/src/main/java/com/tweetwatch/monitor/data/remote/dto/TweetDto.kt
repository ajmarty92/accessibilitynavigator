package com.tweetwatch.monitor.data.remote.dto

import kotlinx.serialization.Serializable

/** Mirrors the `Tweet` JSON object exactly as defined in
 * docs/twitter-monitor-contract.md — field names must match verbatim. */
@Serializable
data class TweetDto(
    val id: String,
    val accountHandle: String,
    val accountDisplayName: String,
    val accountAvatarUrl: String,
    val text: String,
    val createdAt: String,
    val tweetUrl: String,
    val mediaUrls: List<String> = emptyList(),
    val links: List<TweetLinkDto> = emptyList(),
    val isRetweet: Boolean = false,
    val isReply: Boolean = false
)

@Serializable
data class TweetLinkDto(
    val url: String,
    val expandedUrl: String,
    val displayUrl: String
)

@Serializable
data class TweetsResponseDto(
    val tweets: List<TweetDto>,
    val hasMore: Boolean
)
