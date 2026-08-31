package com.tweetwatch.monitor.data.remote

import com.tweetwatch.monitor.data.remote.dto.AccountDto
import com.tweetwatch.monitor.data.remote.dto.AddAccountRequestDto
import com.tweetwatch.monitor.data.remote.dto.DeviceRegistrationRequestDto
import com.tweetwatch.monitor.data.remote.dto.TweetDto
import com.tweetwatch.monitor.data.remote.dto.TweetsResponseDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Retrofit interface for the backend REST API described in
 * docs/twitter-monitor-contract.md. Base path `/api/v1` is baked into the
 * Retrofit instance's baseUrl (see di/NetworkModule.kt); the user-configured
 * host/scheme is swapped in per-request by DynamicBaseUrlInterceptor.
 */
interface ApiService {

    @POST("devices")
    suspend fun registerDevice(@Body body: DeviceRegistrationRequestDto): Response<Unit>

    @DELETE("devices/{fcmToken}")
    suspend fun unregisterDevice(@Path("fcmToken") fcmToken: String): Response<Unit>

    @GET("accounts")
    suspend fun getAccounts(): List<AccountDto>

    @POST("accounts")
    suspend fun addAccount(@Body body: AddAccountRequestDto): Response<AccountDto>

    @DELETE("accounts/{handle}")
    suspend fun removeAccount(@Path("handle") handle: String): Response<Unit>

    @GET("tweets")
    suspend fun getTweets(
        @Query("limit") limit: Int = 50,
        @Query("before") before: String? = null
    ): TweetsResponseDto

    @GET("tweets/{id}")
    suspend fun getTweet(@Path("id") id: String): Response<TweetDto>
}
