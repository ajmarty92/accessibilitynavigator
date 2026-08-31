package com.tweetwatch.monitor.ui.feed.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Reply
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.Repeat
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.tweetwatch.monitor.R
import com.tweetwatch.monitor.domain.model.Tweet
import com.tweetwatch.monitor.domain.model.TweetLink
import com.tweetwatch.monitor.ui.common.openInCustomTab
import com.tweetwatch.monitor.ui.common.toRelativeTimeString

@Composable
fun TweetCard(
    tweet: Tweet,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    maxTextLines: Int = 6
) {
    val context = LocalContext.current

    Card(
        onClick = onClick,
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            if (tweet.isRetweet || tweet.isReply) {
                FlagRow(isRetweet = tweet.isRetweet, isReply = tweet.isReply)
                Spacer(modifier = Modifier.height(6.dp))
            }

            Row(verticalAlignment = Alignment.Top) {
                AsyncImage(
                    model = tweet.accountAvatarUrl,
                    contentDescription = stringResource(R.string.cd_avatar),
                    modifier = Modifier
                        .size(44.dp)
                        .background(MaterialTheme.colorScheme.surfaceVariant, CircleShape),
                    contentScale = ContentScale.Crop
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = tweet.accountDisplayName,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f, fill = false)
                        )
                    }
                    Row {
                        Text(
                            text = "@" + tweet.accountHandle,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = " · " + tweet.createdAt.toRelativeTimeString(),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = tweet.text,
                style = MaterialTheme.typography.bodyLarge,
                maxLines = maxTextLines,
                overflow = TextOverflow.Ellipsis
            )

            val firstImage = tweet.mediaUrls.firstOrNull()
            if (firstImage != null) {
                Spacer(modifier = Modifier.height(10.dp))
                AsyncImage(
                    model = firstImage,
                    contentDescription = stringResource(R.string.cd_tweet_image),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp)
                        .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(12.dp)),
                    contentScale = ContentScale.Crop
                )
            }

            if (tweet.links.isNotEmpty()) {
                Spacer(modifier = Modifier.height(10.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(tweet.links) { link ->
                        LinkChip(link = link, onClick = { openInCustomTab(context, link.expandedUrl) })
                    }
                }
            }
        }
    }
}

@Composable
private fun FlagRow(isRetweet: Boolean, isReply: Boolean) {
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        if (isRetweet) {
            LabelWithIcon(icon = Icons.Filled.Repeat, text = stringResource(R.string.feed_retweeted))
        }
        if (isReply) {
            LabelWithIcon(icon = Icons.AutoMirrored.Filled.Reply, text = stringResource(R.string.feed_reply))
        }
    }
}

@Composable
private fun LabelWithIcon(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(14.dp)
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun LinkChip(link: TweetLink, onClick: () -> Unit) {
    AssistChip(
        onClick = onClick,
        label = {
            Text(
                text = link.displayUrl,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        },
        leadingIcon = {
            Icon(imageVector = Icons.Filled.Link, contentDescription = null, modifier = Modifier.size(16.dp))
        },
        colors = AssistChipDefaults.assistChipColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    )
}
