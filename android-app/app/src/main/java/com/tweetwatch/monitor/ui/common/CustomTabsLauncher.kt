package com.tweetwatch.monitor.ui.common

import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.net.toUri

/**
 * Opens a URL in Chrome Custom Tabs. Used for tappable links inside tweet
 * text and for the "Open on X" affordance — this app deliberately does not
 * build its own in-app browser.
 */
fun openInCustomTab(context: Context, url: String) {
    val uri: Uri = runCatching { url.toUri() }.getOrNull() ?: return
    val customTabsIntent = CustomTabsIntent.Builder()
        .setShowTitle(true)
        .build()
    runCatching { customTabsIntent.launchUrl(context, uri) }
}
