package com.tweetwatch.monitor.data.settings

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.tweetwatch.monitor.domain.model.AppSettings
import com.tweetwatch.monitor.domain.repository.SettingsRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

private const val PREFS_FILE_NAME = "tweetwatch_secure_settings"
private const val KEY_BASE_URL = "base_url"
private const val KEY_API_KEY = "api_key"

/**
 * Backend base URL and the shared X-API-Key are user-entered at runtime and
 * persisted only here, via EncryptedSharedPreferences — never hardcoded in
 * source or build files.
 */
@Singleton
class SettingsRepositoryImpl @Inject constructor(
    @ApplicationContext context: Context
) : SettingsRepository {

    private val prefs: SharedPreferences by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        EncryptedSharedPreferences.create(
            context,
            PREFS_FILE_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    private val _settings = MutableStateFlow<AppSettings?>(null)
    override val settings: StateFlow<AppSettings?> = _settings.asStateFlow()

    init {
        _settings.value = readFromPrefs()
    }

    override fun currentOrNull(): AppSettings? = _settings.value

    override suspend fun save(baseUrl: String, apiKey: String) = withContext(Dispatchers.IO) {
        prefs.edit()
            .putString(KEY_BASE_URL, baseUrl)
            .putString(KEY_API_KEY, apiKey)
            .apply()
        _settings.value = AppSettings(baseUrl, apiKey)
    }

    private fun readFromPrefs(): AppSettings? {
        val baseUrl = prefs.getString(KEY_BASE_URL, null)
        val apiKey = prefs.getString(KEY_API_KEY, null)
        if (baseUrl.isNullOrBlank() || apiKey.isNullOrBlank()) return null
        return AppSettings(baseUrl, apiKey)
    }
}
