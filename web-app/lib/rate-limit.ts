import { prisma } from './prisma'
import { logger } from './logger'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}

/**
 * Sliding-window rate limiter backed by Postgres via the RateLimitEntry
 * table, so it holds up across serverless instances (an in-memory Map
 * would reset per-lambda and undercount). Fails open on DB errors so a
 * database hiccup degrades to "unlimited" rather than blocking everyone.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = new Date()
  const windowStart = new Date(now.getTime() - windowMs)
  const resetAt = new Date(now.getTime() + windowMs)

  try {
    const count = await prisma.rateLimitEntry.count({
      where: { key, createdAt: { gte: windowStart } },
    })

    if (count >= limit) {
      return { allowed: false, remaining: 0, resetAt }
    }

    await prisma.rateLimitEntry.create({ data: { key } })

    // Opportunistic cleanup of this key's stale entries; ignore failures.
    prisma.rateLimitEntry
      .deleteMany({ where: { key, createdAt: { lt: windowStart } } })
      .catch(() => undefined)

    return { allowed: true, remaining: Math.max(0, limit - count - 1), resetAt }
  } catch (error) {
    logger.error('Rate limit check failed, failing open:', error)
    return { allowed: true, remaining: limit, resetAt }
  }
}
