package com.tweetwatch.monitor.ui.common

import com.tweetwatch.monitor.domain.BackendNotConfiguredException
import retrofit2.HttpException
import java.io.IOException

/** Maps a thrown/caught error into a short, user-facing message. */
fun Throwable.toUserMessage(): String = when (this) {
    is BackendNotConfiguredException -> "Connect your backend in Settings first."
    is HttpException -> when (code()) {
        401, 403 -> "Check your API key in Settings."
        404 -> "Not found."
        else -> "Server error (HTTP ${code()})."
    }
    is IOException -> "Network error. Check your connection and backend URL."
    else -> message ?: "Something went wrong."
}
