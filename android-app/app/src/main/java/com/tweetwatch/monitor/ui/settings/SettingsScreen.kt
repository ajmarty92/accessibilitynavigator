package com.tweetwatch.monitor.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tweetwatch.monitor.R
import com.tweetwatch.monitor.domain.model.Account

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(viewModel: SettingsViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = { TopAppBar(title = { Text(stringResource(R.string.settings_title)) }) }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            Text(
                text = stringResource(R.string.settings_backend_section),
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(modifier = Modifier.height(8.dp))

            if (!uiState.isConfigured) {
                Text(
                    text = stringResource(R.string.settings_not_configured),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(8.dp))
            }

            OutlinedTextField(
                value = uiState.baseUrlInput,
                onValueChange = viewModel::onBaseUrlChange,
                label = { Text(stringResource(R.string.settings_base_url_label)) },
                placeholder = { Text(stringResource(R.string.settings_base_url_placeholder)) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = uiState.apiKeyInput,
                onValueChange = viewModel::onApiKeyChange,
                label = { Text(stringResource(R.string.settings_api_key_label)) },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(12.dp))

            Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                Button(
                    onClick = viewModel::saveSettings,
                    enabled = !uiState.isSaving && uiState.baseUrlInput.isNotBlank() && uiState.apiKeyInput.isNotBlank()
                ) {
                    Text(stringResource(R.string.settings_save))
                }
                if (uiState.isSaving) {
                    Spacer(modifier = Modifier.width(12.dp))
                    CircularProgressIndicator(modifier = Modifier.height(20.dp).width(20.dp))
                }
                if (uiState.justSaved && !uiState.isSaving) {
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = stringResource(R.string.settings_saved),
                        color = MaterialTheme.colorScheme.primary,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = stringResource(R.string.settings_accounts_section),
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(modifier = Modifier.height(8.dp))

            Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                OutlinedTextField(
                    value = uiState.addAccountInput,
                    onValueChange = viewModel::onAddAccountInputChange,
                    label = { Text(stringResource(R.string.settings_add_account_label)) },
                    placeholder = { Text(stringResource(R.string.settings_add_account_placeholder)) },
                    singleLine = true,
                    enabled = uiState.isConfigured,
                    modifier = Modifier.weight(1f)
                )
                Spacer(modifier = Modifier.width(8.dp))
                TextButton(
                    onClick = viewModel::addAccount,
                    enabled = uiState.isConfigured && !uiState.isAddingAccount && uiState.addAccountInput.isNotBlank()
                ) {
                    Text(stringResource(R.string.settings_add))
                }
            }

            uiState.accountsErrorMessage?.let { message ->
                Spacer(modifier = Modifier.height(4.dp))
                Text(text = message, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }

            Spacer(modifier = Modifier.height(8.dp))

            when {
                uiState.isLoadingAccounts && uiState.accounts.isEmpty() -> {
                    CircularProgressIndicator(modifier = Modifier.padding(16.dp))
                }
                uiState.accounts.isEmpty() -> {
                    Text(
                        text = stringResource(R.string.settings_no_accounts),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                else -> {
                    AccountList(accounts = uiState.accounts, onRemove = viewModel::removeAccount)
                }
            }
        }
    }
}

@Composable
private fun AccountList(accounts: List<Account>, onRemove: (String) -> Unit) {
    LazyColumn(modifier = Modifier.height((accounts.size * 64).coerceAtMost(400).dp)) {
        items(accounts, key = { it.handle }) { account ->
            ListItem(
                headlineContent = { Text(account.displayName) },
                supportingContent = { Text("@" + account.handle) },
                trailingContent = {
                    IconButton(onClick = { onRemove(account.handle) }) {
                        Icon(Icons.Filled.Close, contentDescription = stringResource(R.string.settings_remove_account_cd))
                    }
                }
            )
        }
    }
}
