package com.tweetwatch.monitor.data.remote.interceptor

import com.tweetwatch.monitor.domain.BackendNotConfiguredException
import com.tweetwatch.monitor.domain.repository.SettingsRepository
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException
import javax.inject.Inject

/**
 * Retrofit is built with a fixed placeholder baseUrl (see NetworkModule) so
 * every request already carries the right `/api/v1/...` path; this
 * interceptor swaps in the user's runtime-configured scheme/host/port before
 * the request goes out, since the real backend URL is only known at runtime
 * (entered in Settings, never hardcoded).
 */
class DynamicBaseUrlInterceptor @Inject constructor(
    private val settingsRepository: SettingsRepository
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val settings = settingsRepository.currentOrNull()
            ?: throw BackendNotConfiguredException()

        val configured = settings.baseUrl.toHttpUrlOrNull()
            ?: throw IOException("Invalid backend base URL: ${settings.baseUrl}")

        val original = chain.request()
        val newUrl = original.url.newBuilder()
            .scheme(configured.scheme)
            .host(configured.host)
            .port(configured.port)
            .build()

        return chain.proceed(original.newBuilder().url(newUrl).build())
    }
}
