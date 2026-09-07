package com.tweetwatch.monitor.ui.detail

import com.tweetwatch.monitor.domain.model.Tweet

data class TweetDetailUiState(
    val tweet: Tweet? = null,
    val isLoading: Boolean = true,
    val errorMessage: String? = null
)
