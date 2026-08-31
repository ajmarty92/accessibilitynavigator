package com.tweetwatch.monitor.di

import android.content.Context
import androidx.room.Room
import com.tweetwatch.monitor.data.local.AppDatabase
import com.tweetwatch.monitor.data.local.TweetDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "tweetwatch.db")
            // No migrations are defined yet for this single-table cache; a
            // schema bump just rebuilds it from the backend on next sync.
            .fallbackToDestructiveMigration()
            .build()

    @Provides
    fun provideTweetDao(database: AppDatabase): TweetDao = database.tweetDao()
}
