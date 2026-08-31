package com.tweetwatch.monitor.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Offline-first local cache row for a tweet. [mediaUrlsJson] and [linksJson]
 * are plain JSON-encoded strings (encoded/decoded in data/mapper) rather than
 * Room @TypeConverters on List<T>, keeping this entity dependency-free.
 */
@Entity(tableName = "tweets")
data class TweetEntity(
    @PrimaryKey val id: String,
    val accountHandle: String,
    val accountDisplayName: String,
    val accountAvatarUrl: String,
    val text: String,
    val createdAtEpochMillis: Long,
    val tweetUrl: String,
    val mediaUrlsJson: String,
    val linksJson: String,
    val isRetweet: Boolean,
    val isReply: Boolean,
    val isPartial: Boolean,
    val cachedAtEpochMillis: Long
)
