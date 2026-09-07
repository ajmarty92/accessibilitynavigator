package com.tweetwatch.monitor.ui.navigation

/** Custom URI scheme used for notification-tap deep links into Tweet detail. */
const val DEEP_LINK_SCHEME = "tweetwatch"
const val DEEP_LINK_HOST = "tweet"

sealed class Destination(val route: String) {
    data object Feed : Destination("feed")
    data object Settings : Destination("settings")
    data object TweetDetail : Destination("tweet/{tweetId}") {
        const val ARG_TWEET_ID = "tweetId"
        fun createRoute(tweetId: String) = "tweet/$tweetId"
        fun deepLinkUri(tweetId: String) = "$DEEP_LINK_SCHEME://$DEEP_LINK_HOST/$tweetId"
    }
}
