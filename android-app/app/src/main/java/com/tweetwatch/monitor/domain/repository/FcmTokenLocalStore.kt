package com.tweetwatch.monitor.domain.repository

/**
 * Small local bookkeeping for the device's FCM token so it can be queued and
 * registered later if [SettingsRepository] wasn't configured yet when
 * onNewToken fired.
 */
interface FcmTokenLocalStore {
    suspend fun getStoredToken(): String?
    suspend fun saveToken(token: String)
    suspend fun markRegistered(registered: Boolean)
    suspend fun isRegistered(): Boolean
}
