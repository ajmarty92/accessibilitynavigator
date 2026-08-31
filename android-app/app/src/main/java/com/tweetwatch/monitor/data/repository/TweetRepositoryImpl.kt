package com.tweetwatch.monitor.data.repository

import com.tweetwatch.monitor.data.local.TweetDao
import com.tweetwatch.monitor.data.mapper.toDomain
import com.tweetwatch.monitor.data.mapper.toEntity
import com.tweetwatch.monitor.data.remote.ApiService
import com.tweetwatch.monitor.domain.model.Tweet
import com.tweetwatch.monitor.domain.repository.TweetRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import retrofit2.HttpException
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

private const val PAGE_SIZE = 50
private const val CACHE_LIMIT = 1000

@Singleton
class TweetRepositoryImpl @Inject constructor(
    private val apiService: ApiService,
    private val tweetDao: TweetDao
) : TweetRepository {

    override fun observeFeed(): Flow<List<Tweet>> =
        tweetDao.observeFeed().map { entities -> entities.map { it.toDomain() } }

    override suspend fun refreshLatest(): Result<Unit> = runCatching {
        val response = apiService.getTweets(limit = PAGE_SIZE)
        tweetDao.upsertAll(response.tweets.map { it.toDomain().toEntity() })
        tweetDao.trimTo(CACHE_LIMIT)
    }

    override suspend fun loadMore(beforeId: String): Result<Boolean> = runCatching {
        val response = apiService.getTweets(limit = PAGE_SIZE, before = beforeId)
        tweetDao.upsertAll(response.tweets.map { it.toDomain().toEntity() })
        response.hasMore
    }

    override suspend fun getTweet(id: String): Result<Tweet> = runCatching {
        val cached = tweetDao.getById(id)
        if (cached != null && !cached.isPartial) {
            return@runCatching cached.toDomain()
        }

        val response = apiService.getTweet(id)
        if (!response.isSuccessful) throw HttpException(response)
        val body = response.body() ?: throw IOException("GET /tweets/$id returned an empty body")

        val full = body.toDomain(isPartial = false)
        tweetDao.upsert(full.toEntity())
        full
    }

    override suspend fun upsertFromPush(tweet: Tweet) {
        tweetDao.upsert(tweet.toEntity())
    }
}
