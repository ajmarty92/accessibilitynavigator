package com.tweetwatch.monitor.data.remote.interceptor

import com.tweetwatch.monitor.domain.BackendNotConfiguredException
import com.tweetwatch.monitor.domain.repository.SettingsRepository
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject

/** Attaches the shared `X-API-Key` header required by every REST call. */
class ApiKeyInterceptor @Inject constructor(
    private val settingsRepository: SettingsRepository
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val settings = settingsRepository.currentOrNull()
            ?: throw BackendNotConfiguredException()

        val request = chain.request().newBuilder()
            .header("X-API-Key", settings.apiKey)
            .build()

        return chain.proceed(request)
    }
}
