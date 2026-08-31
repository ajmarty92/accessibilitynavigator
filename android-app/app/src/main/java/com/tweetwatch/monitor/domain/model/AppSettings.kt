package com.tweetwatch.monitor.domain.model

/** User-entered runtime configuration; never present in source or build files. */
data class AppSettings(
    val baseUrl: String,
    val apiKey: String
) {
    val isValid: Boolean
        get() = baseUrl.isNotBlank() && apiKey.isNotBlank()
}
