package com.tweetwatch.monitor

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.core.content.ContextCompat
import androidx.navigation.NavHostController
import androidx.navigation.compose.rememberNavController
import com.tweetwatch.monitor.ui.navigation.TweetWatchNavHost
import com.tweetwatch.monitor.ui.theme.TweetWatchTheme
import dagger.hilt.android.AndroidEntryPoint

/**
 * Single-activity host. `singleTask` launch mode (see AndroidManifest) means a
 * notification tap when the app is already running delivers here via
 * [onNewIntent] rather than creating a new instance, so the same
 * [navController] handles both the cold-start and warm-start deep link paths.
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private var navController: NavHostController? = null

    private val requestNotificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { /* no-op either way */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestNotificationPermissionIfNeeded()

        setContent {
            TweetWatchTheme {
                val controller = rememberNavController()
                SideEffect { navController = controller }

                LaunchedEffect(Unit) {
                    controller.handleDeepLink(intent)
                }

                TweetWatchNavHost(navController = controller)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        navController?.handleDeepLink(intent)
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        val granted = ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
        if (!granted) {
            requestNotificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }
}
