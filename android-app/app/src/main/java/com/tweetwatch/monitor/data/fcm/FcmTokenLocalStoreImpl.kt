package com.tweetwatch.monitor.data.fcm

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.tweetwatch.monitor.domain.repository.FcmTokenLocalStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

private val Context.fcmDataStore by preferencesDataStore(name = "fcm_token_store")

private val KEY_TOKEN = stringPreferencesKey("fcm_token")
private val KEY_REGISTERED = booleanPreferencesKey("fcm_token_registered")

/** Non-secret bookkeeping (the token itself, and whether it's been registered
 * with the backend yet) — kept in Preferences DataStore, separate from the
 * encrypted backend URL/API key in SettingsRepositoryImpl. */
@Singleton
class FcmTokenLocalStoreImpl @Inject constructor(
    @ApplicationContext private val context: Context
) : FcmTokenLocalStore {

    override suspend fun getStoredToken(): String? =
        context.fcmDataStore.data.first()[KEY_TOKEN]

    override suspend fun saveToken(token: String) {
        context.fcmDataStore.edit { it[KEY_TOKEN] = token }
    }

    override suspend fun markRegistered(registered: Boolean) {
        context.fcmDataStore.edit { it[KEY_REGISTERED] = registered }
    }

    override suspend fun isRegistered(): Boolean =
        context.fcmDataStore.data.first()[KEY_REGISTERED] ?: false
}
