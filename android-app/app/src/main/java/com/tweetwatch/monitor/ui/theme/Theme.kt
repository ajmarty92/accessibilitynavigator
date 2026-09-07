package com.tweetwatch.monitor.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val TweetWatchDarkColorScheme = darkColorScheme(
    primary = AccentBlue,
    onPrimary = BackgroundDark,
    secondary = AccentBlueVariant,
    onSecondary = BackgroundDark,
    background = BackgroundDark,
    onBackground = OnBackgroundDark,
    surface = SurfaceDark,
    onSurface = OnBackgroundDark,
    surfaceVariant = SurfaceVariantDark,
    onSurfaceVariant = OnSurfaceVariantDark,
    error = ErrorRed,
    onError = BackgroundDark,
    outline = DividerDark
)

/**
 * TweetWatch is dark-mode only: this is the single color scheme in the app
 * and it is applied unconditionally, regardless of the device's system
 * light/dark setting and without dynamic color — there is no light theme.
 */
@Composable
fun TweetWatchTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = TweetWatchDarkColorScheme,
        typography = TweetWatchTypography,
        content = content
    )
}
