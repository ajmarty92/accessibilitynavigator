package com.tweetwatch.monitor.domain.repository

interface DeviceRepository {
    /** POST /devices — register or refresh this device's FCM token. */
    suspend fun registerDevice(fcmToken: String): Result<Unit>

    /** DELETE /devices/{fcmToken}. */
    suspend fun unregisterDevice(fcmToken: String): Result<Unit>
}
