package com.tweetwatch.monitor.domain.repository

import com.tweetwatch.monitor.domain.model.AppSettings
import kotlinx.coroutines.flow.StateFlow

interface SettingsRepository {
    /** Null until the user has saved a backend URL + API key. */
    val settings: StateFlow<AppSettings?>

    fun currentOrNull(): AppSettings?

    suspend fun save(baseUrl: String, apiKey: String)
}
