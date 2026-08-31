package com.tweetwatch.monitor.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tweetwatch.monitor.domain.usecase.AddAccountUseCase
import com.tweetwatch.monitor.domain.usecase.ObserveAccountsUseCase
import com.tweetwatch.monitor.domain.usecase.ObserveSettingsUseCase
import com.tweetwatch.monitor.domain.usecase.RefreshAccountsUseCase
import com.tweetwatch.monitor.domain.usecase.RemoveAccountUseCase
import com.tweetwatch.monitor.domain.usecase.SaveSettingsUseCase
import com.tweetwatch.monitor.ui.common.toUserMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val observeSettingsUseCase: ObserveSettingsUseCase,
    private val saveSettingsUseCase: SaveSettingsUseCase,
    private val observeAccountsUseCase: ObserveAccountsUseCase,
    private val refreshAccountsUseCase: RefreshAccountsUseCase,
    private val addAccountUseCase: AddAccountUseCase,
    private val removeAccountUseCase: RemoveAccountUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        val current = observeSettingsUseCase().value
        _uiState.value = _uiState.value.copy(
            baseUrlInput = current?.baseUrl.orEmpty(),
            apiKeyInput = current?.apiKey.orEmpty(),
            isConfigured = current != null
        )
        viewModelScope.launch {
            observeAccountsUseCase().collect { accounts ->
                _uiState.value = _uiState.value.copy(accounts = accounts)
            }
        }
        if (current != null) refreshAccounts()
    }

    fun onBaseUrlChange(value: String) {
        _uiState.value = _uiState.value.copy(baseUrlInput = value, justSaved = false)
    }

    fun onApiKeyChange(value: String) {
        _uiState.value = _uiState.value.copy(apiKeyInput = value, justSaved = false)
    }

    fun onAddAccountInputChange(value: String) {
        _uiState.value = _uiState.value.copy(addAccountInput = value)
    }

    fun saveSettings() {
        val state = _uiState.value
        if (state.baseUrlInput.isBlank() || state.apiKeyInput.isBlank()) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true, justSaved = false)
            saveSettingsUseCase(state.baseUrlInput, state.apiKeyInput)
            _uiState.value = _uiState.value.copy(
                isSaving = false,
                isConfigured = true,
                justSaved = true
            )
            refreshAccounts()
        }
    }

    fun addAccount() {
        val handle = _uiState.value.addAccountInput
        if (handle.isBlank()) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isAddingAccount = true, accountsErrorMessage = null)
            addAccountUseCase(handle).fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(isAddingAccount = false, addAccountInput = "")
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(isAddingAccount = false, accountsErrorMessage = error.toUserMessage())
                }
            )
        }
    }

    fun removeAccount(handle: String) {
        viewModelScope.launch {
            removeAccountUseCase(handle).onFailure { error ->
                _uiState.value = _uiState.value.copy(accountsErrorMessage = error.toUserMessage())
            }
        }
    }

    private fun refreshAccounts() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoadingAccounts = true, accountsErrorMessage = null)
            refreshAccountsUseCase().fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(isLoadingAccounts = false)
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(isLoadingAccounts = false, accountsErrorMessage = error.toUserMessage())
                }
            )
        }
    }
}
