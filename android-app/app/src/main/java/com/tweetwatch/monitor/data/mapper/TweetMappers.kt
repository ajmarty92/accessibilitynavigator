package com.tweetwatch.monitor.data.mapper

import com.tweetwatch.monitor.data.local.TweetEntity
import com.tweetwatch.monitor.data.remote.dto.TweetDto
import com.tweetwatch.monitor.data.remote.dto.TweetLinkDto
import com.tweetwatch.monitor.domain.model.Tweet
import com.tweetwatch.monitor.domain.model.TweetLink
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.Instant

/** JSON instance used only for encoding the small list columns stored on [TweetEntity]. */
private val cacheJson = Json { ignoreUnknownKeys = true }

@Serializable
private data class CachedLink(val url: String, val expandedUrl: String, val displayUrl: String)

fun TweetDto.toDomain(isPartial: Boolean = false): Tweet = Tweet(
    id = id,
    accountHandle = accountHandle,
    accountDisplayName = accountDisplayName,
    accountAvatarUrl = accountAvatarUrl,
    text = text,
    createdAt = Instant.parse(createdAt),
    tweetUrl = tweetUrl,
    mediaUrls = mediaUrls,
    links = links.map { it.toDomain() },
    isRetweet = isRetweet,
    isReply = isReply,
    isPartial = isPartial
)

private fun TweetLinkDto.toDomain() = TweetLink(url = url, expandedUrl = expandedUrl, displayUrl = displayUrl)

fun Tweet.toEntity(): TweetEntity = TweetEntity(
    id = id,
    accountHandle = accountHandle,
    accountDisplayName = accountDisplayName,
    accountAvatarUrl = accountAvatarUrl,
    text = text,
    createdAtEpochMillis = createdAt.toEpochMilli(),
    tweetUrl = tweetUrl,
    mediaUrlsJson = cacheJson.encodeToString(mediaUrls),
    linksJson = cacheJson.encodeToString(links.map { CachedLink(it.url, it.expandedUrl, it.displayUrl) }),
    isRetweet = isRetweet,
    isReply = isReply,
    isPartial = isPartial,
    cachedAtEpochMillis = System.currentTimeMillis()
)

fun TweetEntity.toDomain(): Tweet = Tweet(
    id = id,
    accountHandle = accountHandle,
    accountDisplayName = accountDisplayName,
    accountAvatarUrl = accountAvatarUrl,
    text = text,
    createdAt = Instant.ofEpochMilli(createdAtEpochMillis),
    tweetUrl = tweetUrl,
    mediaUrls = runCatching { cacheJson.decodeFromString<List<String>>(mediaUrlsJson) }.getOrDefault(emptyList()),
    links = runCatching { cacheJson.decodeFromString<List<CachedLink>>(linksJson) }
        .getOrDefault(emptyList())
        .map { TweetLink(it.url, it.expandedUrl, it.displayUrl) },
    isRetweet = isRetweet,
    isReply = isReply,
    isPartial = isPartial
)
