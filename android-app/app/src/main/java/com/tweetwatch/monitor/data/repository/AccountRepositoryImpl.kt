package com.tweetwatch.monitor.data.repository

import com.tweetwatch.monitor.data.mapper.toDomain
import com.tweetwatch.monitor.data.remote.ApiService
import com.tweetwatch.monitor.data.remote.dto.AddAccountRequestDto
import com.tweetwatch.monitor.domain.model.Account
import com.tweetwatch.monitor.domain.repository.AccountRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import retrofit2.HttpException
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AccountRepositoryImpl @Inject constructor(
    private val apiService: ApiService
) : AccountRepository {

    private val _accounts = MutableStateFlow<List<Account>>(emptyList())
    override val accounts: StateFlow<List<Account>> = _accounts.asStateFlow()

    override suspend fun refreshAccounts(): Result<Unit> = runCatching {
        _accounts.value = apiService.getAccounts().map { it.toDomain() }
    }

    override suspend fun addAccount(handle: String): Result<Account> = runCatching {
        val response = apiService.addAccount(AddAccountRequestDto(handle))
        if (!response.isSuccessful) throw HttpException(response)
        val dto = response.body() ?: throw IOException("POST /accounts returned an empty body")
        val account = dto.toDomain()
        _accounts.value = _accounts.value.filterNot { it.handle == account.handle } + account
        account
    }

    override suspend fun removeAccount(handle: String): Result<Unit> = runCatching {
        val response = apiService.removeAccount(handle)
        if (!response.isSuccessful) throw HttpException(response)
        _accounts.value = _accounts.value.filterNot { it.handle == handle }
    }
}
