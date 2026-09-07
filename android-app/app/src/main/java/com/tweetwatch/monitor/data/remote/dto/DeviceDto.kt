package com.tweetwatch.monitor.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class DeviceRegistrationRequestDto(
    val fcmToken: String,
    val platform: String = "android"
)
