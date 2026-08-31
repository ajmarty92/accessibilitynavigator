package com.tweetwatch.monitor.data.mapper

import com.tweetwatch.monitor.data.remote.dto.AccountDto
import com.tweetwatch.monitor.domain.model.Account

fun AccountDto.toDomain(): Account = Account(
    handle = handle,
    displayName = displayName,
    avatarUrl = avatarUrl
)
