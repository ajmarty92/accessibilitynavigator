import fs from "node:fs";
import { initializeApp, cert, type App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { config } from "../config";
import { prisma } from "../db/client";
import type { Tweet as DbTweet } from "@prisma/client";

let app: App | null = null;

function getApp(): App {
  if (app) return app;
  const raw = fs.readFileSync(config.firebaseServiceAccountPath, "utf-8");
  const serviceAccount = JSON.parse(raw);
  app = initializeApp({ credential: cert(serviceAccount) });
  return app;
}

/**
 * Sends one data-only "new_tweet" FCM push, shaped exactly per
 * docs/twitter-monitor-contract.md, to every currently registered device.
 */
export async function pushNewTweet(
  tweet: DbTweet,
  account: { displayName: string; avatarUrl: string | null },
  firstMediaUrl: string | undefined
): Promise<void> {
  const devices = await prisma.device.findMany({ select: { fcmToken: true } });
  if (devices.length === 0) return;

  const truncatedText =
    tweet.text.length > config.fcmTextTruncateLength
      ? `${tweet.text.slice(0, config.fcmTextTruncateLength)}...`
      : tweet.text;

  // FCM data payload values must all be strings; omit optional fields
  // entirely rather than sending "undefined"/"null" strings.
  const data: Record<string, string> = {
    type: "new_tweet",
    tweetId: tweet.id,
    accountHandle: tweet.accountHandle,
    accountDisplayName: account.displayName,
    text: truncatedText,
    tweetUrl: tweet.tweetUrl,
    createdAt: tweet.createdAt.toISOString(),
  };
  if (account.avatarUrl) data.accountAvatarUrl = account.avatarUrl;
  if (firstMediaUrl) data.mediaUrl = firstMediaUrl;

  const tokens = devices.map((d) => d.fcmToken);

  try {
    const response = await getMessaging(getApp()).sendEachForMulticast({
      tokens,
      data,
      android: { priority: "high" },
    });

    const staleTokens: string[] = [];
    response.responses.forEach((r, i) => {
      if (!r.success && isUnregisteredTokenError(r.error?.code)) {
        staleTokens.push(tokens[i]);
      } else if (!r.success) {
        console.warn(`[fcm] Push to a device failed:`, r.error?.message);
      }
    });

    if (staleTokens.length > 0) {
      await prisma.device.deleteMany({ where: { fcmToken: { in: staleTokens } } });
      console.log(`[fcm] Removed ${staleTokens.length} stale device token(s).`);
    }

    console.log(
      `[fcm] Pushed tweet ${tweet.id} to ${response.successCount}/${tokens.length} device(s).`
    );
  } catch (err) {
    console.error(`[fcm] Failed to push tweet ${tweet.id}:`, err);
  }
}

function isUnregisteredTokenError(code?: string): boolean {
  return (
    code === "messaging/registration-token-not-registered" ||
    code === "messaging/invalid-registration-token"
  );
}
