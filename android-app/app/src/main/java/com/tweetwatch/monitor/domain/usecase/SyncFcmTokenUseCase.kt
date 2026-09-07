package com.tweetwatch.monitor.domain.usecase

import com.tweetwatch.monitor.domain.repository.DeviceRepository
import com.tweetwatch.monitor.domain.repository.FcmTokenLocalStore
import com.tweetwatch.monitor.domain.repository.SettingsRepository
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Handles the "queue and register once settings are saved" requirement: a new
 * FCM token can arrive (onNewToken) before the backend URL/API key are set,
 * in which case it's just remembered locally and pushed to the backend the
 * next time we have both a token and configured settings.
 */
@Singleton
class SyncFcmTokenUseCase @Inject constructor(
    private val deviceRepository: DeviceRepository,
    private val settingsRepository: SettingsRepository,
    private val tokenLocalStore: FcmTokenLocalStore
) {
    /** Call from FirebaseMessagingService.onNewToken. */
    suspend fun onNewToken(token: String) {
        tokenLocalStore.saveToken(token)
        tokenLocalStore.markRegistered(false)
        registerPendingIfAny()
    }

    /** Call after settings are saved, and it's safe to call redundantly on app start. */
    suspend fun registerPendingIfAny() {
        if (settingsRepository.currentOrNull() == null) return
        if (tokenLocalStore.isRegistered()) return
        val token = tokenLocalStore.getStoredToken() ?: return
        deviceRepository.registerDevice(token).onSuccess {
            tokenLocalStore.markRegistered(true)
        }
    }
}
