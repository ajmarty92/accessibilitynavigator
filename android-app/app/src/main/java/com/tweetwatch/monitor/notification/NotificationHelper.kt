package com.tweetwatch.monitor.notification

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.graphics.drawable.toBitmap
import androidx.core.net.toUri
import coil.ImageLoader
import coil.request.ImageRequest
import com.tweetwatch.monitor.MainActivity
import com.tweetwatch.monitor.R
import com.tweetwatch.monitor.ui.navigation.Destination
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

private const val CHANNEL_ID = "new_tweets"

/**
 * Builds the rich notification for a pushed tweet. FCM payloads are
 * data-only (see contract), so the app owns 100% of notification
 * construction — BigPictureStyle when media is present, BigTextStyle
 * otherwise — in every app state (foreground/background/killed).
 */
@Singleton
class NotificationHelper @Inject constructor(
    @ApplicationContext private val context: Context,
    private val imageLoader: ImageLoader
) {

    fun ensureChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            context.getString(R.string.notification_channel_name),
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = context.getString(R.string.notification_channel_description)
        }
        val manager = context.getSystemService(NotificationManager::class.java)
        manager?.createNotificationChannel(channel)
    }

    suspend fun showNewTweetNotification(payload: PushTweetPayload) {
        val largeIcon = payload.accountAvatarUrl?.let { loadBitmap(it) }
        val bigPicture = payload.mediaUrl?.let { loadBitmap(it) }

        val title = "${payload.accountDisplayName} (@${payload.accountHandle})"

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(payload.text)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_SOCIAL)
            .setContentIntent(detailPendingIntent(payload.tweetId))
            .addAction(
                0,
                context.getString(R.string.notification_action_open_on_x),
                openOnXPendingIntent(payload.tweetId, payload.tweetUrl)
            )

        if (largeIcon != null) builder.setLargeIcon(largeIcon)

        if (bigPicture != null) {
            builder.setStyle(
                NotificationCompat.BigPictureStyle()
                    .bigPicture(bigPicture)
                    .bigLargeIcon(null as Bitmap?)
            )
        } else {
            builder.setStyle(NotificationCompat.BigTextStyle().bigText(payload.text))
        }

        if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
        ) {
            NotificationManagerCompat.from(context).notify(payload.tweetId.hashCode(), builder.build())
        }
        // If the permission isn't granted (Android 13+, not yet requested/denied), the
        // tweet is still cached locally via UpsertPushedTweetUseCase and visible in-app.
    }

    private fun detailPendingIntent(tweetId: String): PendingIntent {
        val intent = Intent(
            Intent.ACTION_VIEW,
            Destination.TweetDetail.deepLinkUri(tweetId).toUri(),
            context,
            MainActivity::class.java
        ).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        return PendingIntent.getActivity(
            context,
            tweetId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    /** Secondary action: jump straight to the tweet on X, one tap from the
     * notification tray, without opening the app UI first. Built from
     * CustomTabsIntent so a running Chrome picks it up as a Custom Tab; since
     * a PendingIntent fires later with no live Activity to bind a
     * CustomTabsSession to, this can't call launchUrl() directly, so on some
     * browsers it may resolve as a plain browser tab instead of the compact
     * Custom Tabs UI — functionally identical either way. */
    private fun openOnXPendingIntent(tweetId: String, tweetUrl: String): PendingIntent {
        val customTabsIntent = CustomTabsIntent.Builder().build()
        val intent = customTabsIntent.intent.apply {
            data = tweetUrl.toUri()
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        return PendingIntent.getActivity(
            context,
            "$tweetId-open-on-x".hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private suspend fun loadBitmap(url: String): Bitmap? = withContext(Dispatchers.IO) {
        runCatching {
            val request = ImageRequest.Builder(context)
                .data(url)
                .allowHardware(false)
                .build()
            imageLoader.execute(request).drawable?.toBitmap()
        }.getOrNull()
    }
}
