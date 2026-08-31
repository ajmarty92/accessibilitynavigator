package com.tweetwatch.monitor.ui.feed

import com.tweetwatch.monitor.domain.model.Tweet

data class FeedUiState(
    val tweets: List<Tweet> = emptyList(),
    val isConfigured: Boolean = false,
    val isRefreshing: Boolean = false,
    val isLoadingMore: Boolean = false,
    val hasMore: Boolean = true,
    val errorMessage: String? = null
)
