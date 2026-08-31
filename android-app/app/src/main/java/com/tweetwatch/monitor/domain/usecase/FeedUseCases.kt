package com.tweetwatch.monitor.domain.usecase

import com.tweetwatch.monitor.domain.model.Tweet
import com.tweetwatch.monitor.domain.repository.TweetRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class ObserveFeedUseCase @Inject constructor(
    private val tweetRepository: TweetRepository
) {
    operator fun invoke(): Flow<List<Tweet>> = tweetRepository.observeFeed()
}

class RefreshFeedUseCase @Inject constructor(
    private val tweetRepository: TweetRepository
) {
    suspend operator fun invoke(): Result<Unit> = tweetRepository.refreshLatest()
}

class LoadMoreTweetsUseCase @Inject constructor(
    private val tweetRepository: TweetRepository
) {
    suspend operator fun invoke(beforeId: String): Result<Boolean> = tweetRepository.loadMore(beforeId)
}

class GetTweetUseCase @Inject constructor(
    private val tweetRepository: TweetRepository
) {
    suspend operator fun invoke(id: String): Result<Tweet> = tweetRepository.getTweet(id)
}

class UpsertPushedTweetUseCase @Inject constructor(
    private val tweetRepository: TweetRepository
) {
    suspend operator fun invoke(tweet: Tweet) = tweetRepository.upsertFromPush(tweet)
}
