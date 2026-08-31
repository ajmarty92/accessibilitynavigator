package com.tweetwatch.monitor.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.NavType
import androidx.navigation.navArgument
import androidx.navigation.navDeepLink
import com.tweetwatch.monitor.R
import com.tweetwatch.monitor.ui.detail.TweetDetailScreen
import com.tweetwatch.monitor.ui.feed.FeedScreen
import com.tweetwatch.monitor.ui.settings.SettingsScreen

private val topLevelDestinations = listOf(Destination.Feed, Destination.Settings)

@Composable
fun TweetWatchNavHost(navController: NavHostController = rememberNavController()) {
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val showBottomBar = currentRoute == Destination.Feed.route || currentRoute == Destination.Settings.route

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    topLevelDestinations.forEach { destination ->
                        val selected = backStackEntry?.destination?.hierarchy
                            ?.any { it.route == destination.route } == true
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                navController.navigate(destination.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = {
                                Icon(
                                    imageVector = if (destination == Destination.Feed) Icons.Filled.List else Icons.Filled.Settings,
                                    contentDescription = null
                                )
                            },
                            label = {
                                Text(
                                    stringResource(
                                        if (destination == Destination.Feed) R.string.nav_feed else R.string.nav_settings
                                    )
                                )
                            }
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Destination.Feed.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Destination.Feed.route) {
                FeedScreen(
                    onTweetClick = { tweetId ->
                        navController.navigate(Destination.TweetDetail.createRoute(tweetId))
                    }
                )
            }
            composable(Destination.Settings.route) {
                SettingsScreen()
            }
            composable(
                route = Destination.TweetDetail.route,
                arguments = listOf(
                    navArgument(Destination.TweetDetail.ARG_TWEET_ID) { type = NavType.StringType }
                ),
                deepLinks = listOf(
                    navDeepLink { uriPattern = "$DEEP_LINK_SCHEME://$DEEP_LINK_HOST/{${Destination.TweetDetail.ARG_TWEET_ID}}" }
                )
            ) {
                TweetDetailScreen(onBack = { navController.popBackStack() })
            }
        }
    }
}
