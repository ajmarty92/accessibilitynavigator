package com.tweetwatch.monitor.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class AccountDto(
    val handle: String,
    val displayName: String,
    val avatarUrl: String
)

@Serializable
data class AddAccountRequestDto(
    val handle: String
)
