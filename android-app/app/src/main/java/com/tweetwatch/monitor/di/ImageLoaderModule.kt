package com.tweetwatch.monitor.di

import android.content.Context
import coil.ImageLoader
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import javax.inject.Singleton

/**
 * Separate plain OkHttpClient for Coil (avatar/media thumbnails, which are
 * fetched directly from Twitter's CDN, not the backend) — it deliberately
 * does NOT carry the DynamicBaseUrlInterceptor/ApiKeyInterceptor used for
 * backend API calls.
 */
@Module
@InstallIn(SingletonComponent::class)
object ImageLoaderModule {

    @Provides
    @Singleton
    fun provideImageLoader(@ApplicationContext context: Context): ImageLoader =
        ImageLoader.Builder(context)
            .okHttpClient { OkHttpClient.Builder().build() }
            .crossfade(true)
            .build()
}
