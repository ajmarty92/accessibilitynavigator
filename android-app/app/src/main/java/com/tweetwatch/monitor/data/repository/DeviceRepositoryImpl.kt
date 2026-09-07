package com.tweetwatch.monitor.data.repository

import com.tweetwatch.monitor.data.remote.ApiService
import com.tweetwatch.monitor.data.remote.dto.DeviceRegistrationRequestDto
import com.tweetwatch.monitor.domain.repository.DeviceRepository
import retrofit2.HttpException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DeviceRepositoryImpl @Inject constructor(
    private val apiService: ApiService
) : DeviceRepository {

    override suspend fun registerDevice(fcmToken: String): Result<Unit> = runCatching {
        val response = apiService.registerDevice(DeviceRegistrationRequestDto(fcmToken = fcmToken))
        if (!response.isSuccessful) throw HttpException(response)
    }

    override suspend fun unregisterDevice(fcmToken: String): Result<Unit> = runCatching {
        val response = apiService.unregisterDevice(fcmToken)
        if (!response.isSuccessful) throw HttpException(response)
    }
}
