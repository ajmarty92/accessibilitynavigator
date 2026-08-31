package com.tweetwatch.monitor.di

import com.tweetwatch.monitor.data.fcm.FcmTokenLocalStoreImpl
import com.tweetwatch.monitor.data.repository.AccountRepositoryImpl
import com.tweetwatch.monitor.data.repository.DeviceRepositoryImpl
import com.tweetwatch.monitor.data.repository.TweetRepositoryImpl
import com.tweetwatch.monitor.data.settings.SettingsRepositoryImpl
import com.tweetwatch.monitor.domain.repository.AccountRepository
import com.tweetwatch.monitor.domain.repository.DeviceRepository
import com.tweetwatch.monitor.domain.repository.FcmTokenLocalStore
import com.tweetwatch.monitor.domain.repository.SettingsRepository
import com.tweetwatch.monitor.domain.repository.TweetRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindTweetRepository(impl: TweetRepositoryImpl): TweetRepository

    @Binds
    @Singleton
    abstract fun bindAccountRepository(impl: AccountRepositoryImpl): AccountRepository

    @Binds
    @Singleton
    abstract fun bindDeviceRepository(impl: DeviceRepositoryImpl): DeviceRepository

    @Binds
    @Singleton
    abstract fun bindSettingsRepository(impl: SettingsRepositoryImpl): SettingsRepository

    @Binds
    @Singleton
    abstract fun bindFcmTokenLocalStore(impl: FcmTokenLocalStoreImpl): FcmTokenLocalStore
}
