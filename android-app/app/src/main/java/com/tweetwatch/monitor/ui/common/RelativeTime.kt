package com.tweetwatch.monitor.ui.common

import android.text.format.DateUtils
import java.time.Instant

/** e.g. "5m", "2h", "3d" — falls back to an absolute date for older tweets. */
fun Instant.toRelativeTimeString(now: Instant = Instant.now()): String {
    val flags = DateUtils.FORMAT_ABBREV_RELATIVE
    return DateUtils.getRelativeTimeSpanString(
        toEpochMilli(),
        now.toEpochMilli(),
        DateUtils.MINUTE_IN_MILLIS,
        flags
    ).toString()
}
