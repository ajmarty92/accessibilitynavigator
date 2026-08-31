package com.tweetwatch.monitor.domain.repository

import com.tweetwatch.monitor.domain.model.Account
import kotlinx.coroutines.flow.StateFlow

interface AccountRepository {

    /** Last-fetched list of tracked accounts, kept in memory for the Settings screen. */
    val accounts: StateFlow<List<Account>>

    suspend fun refreshAccounts(): Result<Unit>

    suspend fun addAccount(handle: String): Result<Account>

    suspend fun removeAccount(handle: String): Result<Unit>
}
