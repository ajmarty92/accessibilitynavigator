package com.tweetwatch.monitor.domain.model

/** A tracked X/Twitter account, per GET/POST /accounts. */
data class Account(
    val handle: String,
    val displayName: String,
    val avatarUrl: String?
)
