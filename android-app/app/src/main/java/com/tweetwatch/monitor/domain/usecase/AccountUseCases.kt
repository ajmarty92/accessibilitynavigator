package com.tweetwatch.monitor.domain.usecase

import com.tweetwatch.monitor.domain.model.Account
import com.tweetwatch.monitor.domain.repository.AccountRepository
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject

class ObserveAccountsUseCase @Inject constructor(
    private val accountRepository: AccountRepository
) {
    operator fun invoke(): StateFlow<List<Account>> = accountRepository.accounts
}

class RefreshAccountsUseCase @Inject constructor(
    private val accountRepository: AccountRepository
) {
    suspend operator fun invoke(): Result<Unit> = accountRepository.refreshAccounts()
}

class AddAccountUseCase @Inject constructor(
    private val accountRepository: AccountRepository
) {
    suspend operator fun invoke(handle: String): Result<Account> {
        val cleaned = handle.trim().removePrefix("@")
        if (cleaned.isEmpty()) return Result.failure(IllegalArgumentException("Handle must not be empty"))
        return accountRepository.addAccount(cleaned)
    }
}

class RemoveAccountUseCase @Inject constructor(
    private val accountRepository: AccountRepository
) {
    suspend operator fun invoke(handle: String): Result<Unit> = accountRepository.removeAccount(handle)
}
