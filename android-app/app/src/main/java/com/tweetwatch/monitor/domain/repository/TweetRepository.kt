package com.tweetwatch.monitor.domain.repository

import com.tweetwatch.monitor.domain.model.Tweet
import kotlinx.coroutines.flow.Flow

/**
 * Offline-first tweet access: [observeFeed] always reads from the local Room
 * cache; the refresh/load-more/getTweet functions sync that cache from the
 * backend so the Flow above updates reactively.
 */
interface TweetRepository {

    fun observeFeed(): Flow<List<Tweet>>

    /** GET /tweets (no cursor) — pulls the newest page and upserts it locally. */
    suspend fun refreshLatest(): Result<Unit>

    /** GET /tweets?before={beforeId} — pulls an older page for infinite scroll.
     * Returns whether the backend reports more pages beyond this one. */
    suspend fun loadMore(beforeId: String): Result<Boolean>

    /** Local cache first; if missing or [Tweet.isPartial], fetches
     * GET /tweets/{id} and upserts the full tweet before returning it. */
    suspend fun getTweet(id: String): Result<Tweet>

    /** Inserts a tweet built from an FCM data payload immediately, so it's
     * viewable offline before any network round trip. */
    suspend fun upsertFromPush(tweet: Tweet)
}
