package com.tweetwatch.monitor.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(entities = [TweetEntity::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun tweetDao(): TweetDao
}
