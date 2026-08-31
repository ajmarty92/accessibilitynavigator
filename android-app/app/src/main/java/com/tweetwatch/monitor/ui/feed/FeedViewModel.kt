package com.tweetwatch.monitor.ui.feed

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tweetwatch.monitor.domain.usecase.LoadMoreTweetsUseCase
import com.tweetwatch.monitor.domain.usecase.ObserveFeedUseCase
import com.tweetwatch.monitor.domain.usecase.ObserveSettingsUseCase
import com.tweetwatch.monitor.domain.usecase.RefreshFeedUseCase
import com.tweetwatch.monitor.ui.common.toUserMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

private data class FeedExtras(
    val isRefreshing: Boolean = false,
    val isLoadingMore: Boolean = false,
    val hasMore: Boolean = true,
    val errorMessage: String? = null
)

@HiltViewModel
class FeedViewModel @Inject constructor(
    private val observeFeedUseCase: ObserveFeedUseCase,
    private val refreshFeedUseCase: RefreshFeedUseCase,
    private val loadMoreTweetsUseCase: LoadMoreTweetsUseCase,
    private val observeSettingsUseCase: ObserveSettingsUseCase
) : ViewModel() {

    private val extras = MutableStateFlow(FeedExtras())

    val uiState = combine(
        observeFeedUseCase(),
        observeSettingsUseCase(),
        extras
    ) { tweets, settings, extraState ->
        FeedUiState(
            tweets = tweets,
            isConfigured = settings != null,
            isRefreshing = extraState.isRefreshing,
            isLoadingMore = extraState.isLoadingMore,
            hasMore = extraState.hasMore,
            errorMessage = extraState.errorMessage
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), FeedUiState())

    private var hasAutoRefreshed = false

    init {
        viewModelScope.launch {
            observeSettingsUseCase().collect { settings ->
                if (settings != null && !hasAutoRefreshed) {
                    hasAutoRefreshed = true
                    refresh()
                }
            }
        }
    }

    fun onRefresh() {
        viewModelScope.launch { refresh() }
    }

    fun onLoadMore() {
        val current = uiState.value
        if (current.isLoadingMore || current.isRefreshing || !current.hasMore) return
        val oldestId = current.tweets.lastOrNull()?.id ?: return

        viewModelScope.launch {
            extras.value = extras.value.copy(isLoadingMore = true)
            loadMoreTweetsUseCase(oldestId).fold(
                onSuccess = { hasMore ->
                    extras.value = extras.value.copy(isLoadingMore = false, hasMore = hasMore, errorMessage = null)
                },
                onFailure = { error ->
                    extras.value = extras.value.copy(isLoadingMore = false, errorMessage = error.toUserMessage())
                }
            )
        }
    }

    private suspend fun refresh() {
        extras.value = extras.value.copy(isRefreshing = true, errorMessage = null)
        refreshFeedUseCase().fold(
            onSuccess = {
                extras.value = extras.value.copy(isRefreshing = false, hasMore = true, errorMessage = null)
            },
            onFailure = { error ->
                extras.value = extras.value.copy(isRefreshing = false, errorMessage = error.toUserMessage())
            }
        )
    }
}
