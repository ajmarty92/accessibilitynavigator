package com.tweetwatch.monitor.ui.settings

import com.tweetwatch.monitor.domain.model.Account

data class SettingsUiState(
    val baseUrlInput: String = "",
    val apiKeyInput: String = "",
    val isConfigured: Boolean = false,
    val isSaving: Boolean = false,
    val justSaved: Boolean = false,
    val accounts: List<Account> = emptyList(),
    val isLoadingAccounts: Boolean = false,
    val addAccountInput: String = "",
    val isAddingAccount: Boolean = false,
    val accountsErrorMessage: String? = null
)
