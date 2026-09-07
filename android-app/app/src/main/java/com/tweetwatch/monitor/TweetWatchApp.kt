package com.tweetwatch.monitor

import android.app.Application
import com.google.firebase.messaging.FirebaseMessaging
import com.tweetwatch.monitor.domain.usecase.SyncFcmTokenUseCase
import com.tweetwatch.monitor.notification.NotificationHelper
import dagger.hilt.android.HiltAndroidApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltAndroidApp
class TweetWatchApp : Application() {

    @Inject lateinit var notificationHelper: NotificationHelper
    @Inject lateinit var syncFcmTokenUseCase: SyncFcmTokenUseCase

    private val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        // Must exist before any notification can be posted (including one built
        // from a data-only FCM message while the app is backgrounded/killed).
        notificationHelper.ensureChannel()

        // Belt-and-braces alongside onNewToken: covers the case where the token
        // was generated before settings were configured (or before this
        // install ever successfully registered it) and onNewToken hasn't
        // fired again since. Silently no-ops if google-services.json hasn't
        // been dropped in yet (see README) so Firebase isn't initialized.
        runCatching {
            FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    val token = task.result ?: return@addOnCompleteListener
                    applicationScope.launch { syncFcmTokenUseCase.onNewToken(token) }
                }
            }
        }
    }
}
