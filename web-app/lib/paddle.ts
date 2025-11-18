import { Paddle, Environment } from '@paddle/paddle-node-sdk'

let paddle: Paddle

export interface PricingTier {
  id: string
  name: string
  monthlyPrice: number
  yearlyPrice: number
  features: {
    scans: number | 'unlimited'
    sites: number | 'unlimited'
    ai_prioritization: boolean
    api_access: boolean
    custom_rules: boolean
    support: 'email' | 'priority' | 'dedicated'
  }
  paddleMonthlyPriceId: string
  paddleYearlyPriceId: string
}

export const PRICING_TIERS: Record<string, PricingTier> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 19900, // $199 in cents
    yearlyPrice: 199000, // $1,999 (2 months free)
    features: {
      scans: 100,
      sites: 5,
      ai_prioritization: true,
      api_access: false,
      custom_rules: false,
      support: 'email'
    },
    paddleMonthlyPriceId: 'pri_01hgx4q2g2q8m4n8h2k6j7q7j8',
    paddleYearlyPriceId: 'pri_01hgx4q2g2q8m4n8h2k6j7q7j9'
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    monthlyPrice: 59900, // $599
    yearlyPrice: 599000, // $5,999 (2 months free)
    features: {
      scans: 1000,
      sites: 25,
      ai_prioritization: true,
      api_access: true,
      custom_rules: true,
      support: 'priority'
    },
    paddleMonthlyPriceId: 'pri_01hgx4q2g2q8m4n8h2k6j7q7ja',
    paddleYearlyPriceId: 'pri_01hgx4q2g2q8m4n8h2k6j7q7jb'
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 199900, // $1,999
    yearlyPrice: 1999000, // $19,990 (2 months free)
    features: {
      scans: 'unlimited',
      sites: 'unlimited',
      ai_prioritization: true,
      api_access: true,
      custom_rules: true,
      support: 'dedicated'
    },
    paddleMonthlyPriceId: 'pri_01hgx4q2g2q8m4n8h2k6j7q7jc',
    paddleYearlyPriceId: 'pri_01hgx4q2g2q8m4n8h2k6j7q7jd'
  }
}

export interface SubscriptionInfo {
  id: string
  customerId: string
  tier: string
  status: 'active' | 'canceled' | 'past_due' | 'paused'
  currentPeriodEnd: number
  cancelAtPeriodEnd: boolean
  usage: {
    scansThisMonth: number
    sitesTracked: number
  }
  paddleSubscriptionId: string
}

export function initializePaddleClient() {
    if (!paddle) {
      paddle = new Paddle(process.env.PADDLE_API_KEY!, {
        environment: process.env.NODE_ENV === 'production' ? Environment.production : Environment.sandbox,
      })
    }
    return paddle
  }

export async function createSubscription(
    customerId: string,
    tierId: string,
    billingCycle: 'monthly' | 'yearly' = 'monthly'
  ) {
    const paddleClient = initializePaddleClient()
    const tier = PRICING_TIERS[tierId]
    if (!tier) {
      throw new Error(`Invalid tier: ${tierId}`)
    }

    const priceId = billingCycle === 'yearly' 
      ? tier.paddleYearlyPriceId 
      : tier.paddleMonthlyPriceId

    try {
      const subscription = await paddleClient.subscriptions.create({
        customer_id: customerId,
        items: [{
          price_id: priceId,
          quantity: 1,
        }],
        billing_cycle: billingCycle,
        payment_method: {
          type: 'card',
        },
      })

      return subscription
    } catch (error) {
      console.error('Paddle subscription creation failed:', error)
      throw error
    }
  }

export async function updateSubscription(
    subscriptionId: string,
    newTierId: string
  ) {
    const paddleClient = initializePaddleClient()
    const newTier = PRICING_TIERS[newTierId]
    if (!newTier) {
      throw new Error(`Invalid tier: ${newTierId}`)
    }

    try {
      const updatedSubscription = await paddleClient.subscriptions.update(subscriptionId, {
        items: [{
          price_id: newTier.paddleMonthlyPriceId,
          quantity: 1,
        }],
        proration_billing_mode: 'prorated_immediately',
      })

      return updatedSubscription
    } catch (error) {
      console.error('Paddle subscription update failed:', error)
      throw error
    }
  }

export async function cancelSubscription(subscriptionId: string, immediate = false) {
    const paddleClient = initializePaddleClient()
    
    try {
      if (immediate) {
        const subscription = await paddleClient.subscriptions.cancel(subscriptionId, {
          effective_from: 'immediately',
        })
        return subscription
      } else {
        const subscription = await paddleClient.subscriptions.cancel(subscriptionId, {
          effective_from: 'next_billing_period',
        })
        return subscription
      }
    } catch (error) {
      console.error('Paddle subscription cancellation failed:', error)
      throw error
    }
  }

export async function createCustomer(email: string, name?: string) {
    const paddleClient = initializePaddleClient()
    
    try {
      const customer = await paddleClient.customers.create({
        email,
        name,
        address: {
          country: 'US', // Default country, can be updated
        },
      })

      return customer
    } catch (error) {
      console.error('Paddle customer creation failed:', error)
      throw error
    }
  }

export async function getCustomerSubscription(customerId: string): Promise<SubscriptionInfo | null> {
    const paddleClient = initializePaddleClient()
    
    try {
      const subscriptions = await paddleClient.subscriptions.list({
        customer_id: customerId,
        status: ['active', 'paused', 'past_due'],
        limit: 1,
      })

      if (subscriptions.data.length === 0) {
        return null
      }

      const subscription = subscriptions.data[0]
      const tierId = subscription.items?.[0]?.price?.custom_data?.tier || 'starter'
      const tier = PRICING_TIERS[tierId]

      // Usage would come from your database
      const usage = {
        scansThisMonth: 0, // Get from your usage tracking
        sitesTracked: 0,   // Get from your usage tracking
      }

      return {
        id: subscription.id,
        customerId: subscription.customer_id,
        tier: tierId,
        status: subscription.status as any,
        currentPeriodEnd: new Date(subscription.current_billing_period?.end || '').getTime(),
        cancelAtPeriodEnd: subscription.scheduled_change?.action === 'cancel',
        usage,
        paddleSubscriptionId: subscription.id,
      }
    } catch (error) {
      console.error('Failed to get customer subscription:', error)
      return null
    }
  }

export async function handlePaddleWebhook(event: any) {
    switch (event.event_type) {
      case 'subscription.activated':
        console.log('Paddle subscription activated:', event.data.id)
        // Update subscription status in your database
        break

      case 'subscription.canceled':
        console.log('Paddle subscription canceled:', event.data.id)
        // Update subscription status in your database
        break

      case 'subscription.paused':
        console.log('Paddle subscription paused:', event.data.id)
        // Update subscription status in your database
        break

      case 'payment.succeeded':
        console.log('Paddle payment succeeded:', event.data.id)
        // Update payment records in your database
        break

      case 'payment.failed':
        console.log('Paddle payment failed:', event.data.id)
        // Notify customer of failed payment
        break

      default:
        console.log(`Unhandled Paddle event type: ${event.event_type}`)
    }
  }

export function formatPrice(price: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price / 100)
  }

export function getTierPrice(tierId: string, yearly = false): number {
    const tier = PRICING_TIERS[tierId]
    if (!tier) return 0
    return yearly ? tier.yearlyPrice : tier.monthlyPrice
  }

export function calculateMonthlyEquivalent(yearlyPrice: number): number {
    return Math.round(yearlyPrice / 12 * 100) / 100
  }

export function getSavingsPercentage(tierId: string): number {
    const tier = PRICING_TIERS[tierId]
    if (!tier) return 0
    
    const monthlyTotal = tier.monthlyPrice * 12
    const yearlyPrice = tier.yearlyPrice
    const savings = monthlyTotal - yearlyPrice
    
    return Math.round((savings / monthlyTotal) * 100)
  }

// Usage tracking for subscription limits
export async function trackScanUsage(userId: string) {
    const subscription = await getCustomerSubscription(userId)
    const currentUsage = await getCurrentMonthUsage(userId)
    
    if (subscription?.tier !== 'enterprise' && 
        typeof subscription?.features.scans === 'number' &&
        currentUsage.scans >= subscription.features.scans) {
      throw new Error('Scan limit exceeded for current plan. Please upgrade to continue scanning.')
    }
    
    await incrementUsage(userId, 'scans')
  }

// Mock functions - implement these with your database
async function getCurrentMonthUsage(userId: string): Promise<{ scans: number; sites: number }> {
    // Implement with your database
    return { scans: 0, sites: 0 }
  }

async function incrementUsage(userId: string, type: 'scans' | 'sites'): Promise<void> {
    // Implement with your database
  }