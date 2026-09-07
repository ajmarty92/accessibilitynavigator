package com.tweetwatch.monitor.domain.usecase

import com.tweetwatch.monitor.domain.model.AppSettings
import com.tweetwatch.monitor.domain.repository.SettingsRepository
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject

class ObserveSettingsUseCase @Inject constructor(
    private val settingsRepository: SettingsRepository
) {
    operator fun invoke(): StateFlow<AppSettings?> = settingsRepository.settings
}

class SaveSettingsUseCase @Inject constructor(
    private val settingsRepository: SettingsRepository,
    private val syncFcmTokenUseCase: SyncFcmTokenUseCase
) {
    suspend operator fun invoke(baseUrl: String, apiKey: String) {
        settingsRepository.save(baseUrl.trim().trimEnd('/'), apiKey.trim())
        // Flush any FCM token that arrived before the backend was configured.
        syncFcmTokenUseCase.registerPendingIfAny()
    }
}
