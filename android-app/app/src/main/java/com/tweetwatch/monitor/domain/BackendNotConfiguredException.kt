package com.tweetwatch.monitor.domain

/** Thrown by the data layer when a network call is attempted before the user
 * has entered a backend base URL and API key in Settings. */
class BackendNotConfiguredException : Exception("Backend URL and API key are not configured yet")
