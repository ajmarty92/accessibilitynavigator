package com.tweetwatch.monitor.ui.detail

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tweetwatch.monitor.domain.usecase.GetTweetUseCase
import com.tweetwatch.monitor.ui.common.toUserMessage
import com.tweetwatch.monitor.ui.navigation.Destination
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TweetDetailViewModel @Inject constructor(
    private val getTweetUseCase: GetTweetUseCase,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val tweetId: String = checkNotNull(savedStateHandle[Destination.TweetDetail.ARG_TWEET_ID])

    private val _uiState = MutableStateFlow(TweetDetailUiState())
    val uiState: StateFlow<TweetDetailUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun retry() = load()

    private fun load() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            getTweetUseCase(tweetId).fold(
                onSuccess = { tweet ->
                    _uiState.value = TweetDetailUiState(tweet = tweet, isLoading = false)
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = error.toUserMessage())
                }
            )
        }
    }
}
