import { prisma } from './prisma'
import { PRICING_TIERS } from './stripe'

export interface UsageMetrics {
  scansThisMonth: number
  scansToday: number
  sitesTracked: number
  lastScanDate: Date | null
}

export async function getUserUsage(userId: string): Promise<UsageMetrics> {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Get scans this month
    const scansThisMonth = await prisma.scan.count({
      where: {
        userId,
        timestamp: {
          gte: startOfMonth,
        },
      },
    })

    // Get scans today
    const scansToday = await prisma.scan.count({
      where: {
        userId,
        timestamp: {
          gte: startOfDay,
        },
      },
    })

    // Get unique sites tracked
    const uniqueSites = await prisma.scan.groupBy({
      by: ['url'],
      where: {
        userId,
      },
    })

    // Get last scan date
    const lastScan = await prisma.scan.findFirst({
      where: {
        userId,
      },
      orderBy: {
        timestamp: 'desc',
      },
      select: {
        timestamp: true,
      },
    })

    return {
      scansThisMonth,
      scansToday,
      sitesTracked: uniqueSites.length,
      lastScanDate: lastScan?.timestamp || null,
    }
  } catch (error) {
    console.error('Failed to get user usage:', error)
    return {
      scansThisMonth: 0,
      scansToday: 0,
      sitesTracked: 0,
      lastScanDate: null,
    }
  }
}

export async function canUserScan(userId: string): Promise<{
  canScan: boolean
  reason?: string
  scansRemaining?: number
  resetDate?: Date
}> {
  try {
    // Get user's subscription
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
      },
    })

    if (!user) {
      return { canScan: false, reason: 'User not found' }
    }

    // If no subscription, check if they're in trial
    if (!user.subscription) {
      const usage = await getUserUsage(userId)
      const trialScans = 5 // 5 free scans for trial
      
      if (usage.scansThisMonth >= trialScans) {
        return { 
          canScan: false, 
          reason: 'Trial limit exceeded',
          scansRemaining: 0
        }
      }
      
      return { 
        canScan: true, 
        scansRemaining: trialScans - usage.scansThisMonth 
      }
    }

    const tier = PRICING_TIERS[user.subscription.tier]
    if (!tier) {
      return { canScan: false, reason: 'Invalid subscription tier' }
    }

    // Enterprise has unlimited scans
    if (tier.features.scans === 'unlimited') {
      return { canScan: true }
    }

    const usage = await getUserUsage(userId)
    const scansLimit = tier.features.scans as number

    if (usage.scansThisMonth >= scansLimit) {
      const resetDate = new Date()
      resetDate.setMonth(resetDate.getMonth() + 1)
      resetDate.setDate(1)

      return { 
        canScan: false, 
        reason: 'Scan limit exceeded for this month',
        scansRemaining: 0,
        resetDate
      }
    }

    return { 
      canScan: true, 
      scansRemaining: scansLimit - usage.scansThisMonth 
    }
  } catch (error) {
    console.error('Failed to check user scan permission:', error)
    return { canScan: false, reason: 'Unable to verify usage' }
  }
}

export async function trackScanUsage(userId: string, scanId: string): Promise<void> {
  try {
    // This would be called after a successful scan
    // Usage is tracked implicitly by creating scan records in the database
    console.log(`Tracked scan usage for user ${userId}, scan ${scanId}`)
  } catch (error) {
    console.error('Failed to track scan usage:', error)
  }
}

export async function checkSiteLimit(userId: string, newSiteUrl: string): Promise<{
  canAddSite: boolean
  reason?: string
  sitesRemaining?: number
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
      },
    })

    if (!user) {
      return { canAddSite: false, reason: 'User not found' }
    }

    // If no subscription, check trial limit
    if (!user.subscription) {
      const uniqueSites = await prisma.scan.groupBy({
        by: ['url'],
        where: { userId },
      })

      const trialSitesLimit = 3 // 3 sites for trial
      
      if (uniqueSites.length >= trialSitesLimit) {
        return { 
          canAddSite: false, 
          reason: 'Trial site limit exceeded',
          sitesRemaining: 0
        }
      }

      return { 
        canAddSite: true, 
        sitesRemaining: trialSitesLimit - uniqueSites.length 
      }
    }

    const tier = PRICING_TIERS[user.subscription.tier]
    if (!tier) {
      return { canAddSite: false, reason: 'Invalid subscription tier' }
    }

    // Enterprise has unlimited sites
    if (tier.features.sites === 'unlimited') {
      return { canAddSite: true }
    }

    const uniqueSites = await prisma.scan.groupBy({
      by: ['url'],
      where: { userId },
    })

    const sitesLimit = tier.features.sites as number

    if (uniqueSites.length >= sitesLimit) {
      return { 
        canAddSite: false, 
        reason: 'Site limit exceeded for current plan',
        sitesRemaining: 0
      }
    }

    return { 
      canAddSite: true, 
      sitesRemaining: sitesLimit - uniqueSites.length 
    }
  } catch (error) {
    console.error('Failed to check site limit:', error)
    return { canAddSite: false, reason: 'Unable to verify sites' }
  }
}

export async function getUsageStats(userId: string): Promise<{
  scansThisMonth: number
  scansLimit: number | 'unlimited'
  sitesTracked: number
  sitesLimit: number | 'unlimited'
  percentageUsed: {
    scans: number
    sites: number
  }
  resetDate: Date
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const usage = await getUserUsage(userId)
    const resetDate = new Date()
    resetDate.setMonth(resetDate.getMonth() + 1)
    resetDate.setDate(1)

    if (!user.subscription) {
      // Trial user stats
      const trialScansLimit = 5
      const trialSitesLimit = 3

      return {
        scansThisMonth: usage.scansThisMonth,
        scansLimit: trialScansLimit,
        sitesTracked: usage.sitesTracked,
        sitesLimit: trialSitesLimit,
        percentageUsed: {
          scans: (usage.scansThisMonth / trialScansLimit) * 100,
          sites: (usage.sitesTracked / trialSitesLimit) * 100,
        },
        resetDate,
      }
    }

    const tier = PRICING_TIERS[user.subscription.tier]
    if (!tier) {
      throw new Error('Invalid subscription tier')
    }

    const scansLimit = tier.features.scans
    const sitesLimit = tier.features.sites

    return {
      scansThisMonth: usage.scansThisMonth,
      scansLimit,
      sitesTracked: usage.sitesTracked,
      sitesLimit,
      percentageUsed: {
        scans: scansLimit === 'unlimited' ? 0 : (usage.scansThisMonth / scansLimit) * 100,
        sites: sitesLimit === 'unlimited' ? 0 : (usage.sitesTracked / sitesLimit) * 100,
      },
      resetDate,
    }
  } catch (error) {
    console.error('Failed to get usage stats:', error)
    throw error
  }
}

export async function recordUsageEvent(
  userId: string, 
  eventType: 'scan_completed' | 'site_added' | 'feature_used',
  metadata?: Record<string, any>
): Promise<void> {
  try {
    // This could be extended to track detailed usage analytics
    // For now, we'll just log the event
    console.log(`Usage event: ${eventType} for user ${userId}`, metadata)
    
    // In a real implementation, you might:
    // - Save to a usage_events table
    // - Send to analytics service
    // - Update real-time metrics
  } catch (error) {
    console.error('Failed to record usage event:', error)
  }
}

export async function isFeatureAvailable(
  userId: string, 
  feature: keyof PRICING_TIERS[string]['features']
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
      },
    })

    if (!user) {
      return false
    }

    // Trial users get limited features
    if (!user.subscription) {
      return ['ai_prioritization'].includes(feature)
    }

    const tier = PRICING_TIERS[user.subscription.tier]
    if (!tier) {
      return false
    }

    return tier.features[feature]
  } catch (error) {
    console.error('Failed to check feature availability:', error)
    return false
  }
}