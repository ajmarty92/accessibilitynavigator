package com.tweetwatch.monitor.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface TweetDao {

    @Query("SELECT * FROM tweets ORDER BY createdAtEpochMillis DESC")
    fun observeFeed(): Flow<List<TweetEntity>>

    @Query("SELECT * FROM tweets WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): TweetEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(tweet: TweetEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(tweets: List<TweetEntity>)

    /** Keeps the offline cache from growing without bound on a long-lived install. */
    @Query(
        """
        DELETE FROM tweets WHERE id NOT IN (
            SELECT id FROM tweets ORDER BY createdAtEpochMillis DESC LIMIT :keep
        )
        """
    )
    suspend fun trimTo(keep: Int)
}
