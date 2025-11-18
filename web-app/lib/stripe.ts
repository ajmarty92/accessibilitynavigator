import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

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
  stripeMonthlyPriceId: string
  stripeYearlyPriceId: string
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
    stripeMonthlyPriceId: 'price_starter_monthly',
    stripeYearlyPriceId: 'price_starter_yearly'
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
    stripeMonthlyPriceId: 'price_professional_monthly',
    stripeYearlyPriceId: 'price_professional_yearly'
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
    stripeMonthlyPriceId: 'price_enterprise_monthly',
    stripeYearlyPriceId: 'price_enterprise_yearly'
  }
}

export interface SubscriptionInfo {
  id: string
  customerId: string
  tier: string
  status: 'active' | 'canceled' | 'past_due' | 'incomplete'
  currentPeriodEnd: number
  cancelAtPeriodEnd: boolean
  usage: {
    scansThisMonth: number
    sitesTracked: number
  }
}

export async function createSubscription(
  customerId: string,
  tierId: string,
  billingCycle: 'monthly' | 'yearly' = 'monthly'
) {
  const tier = PRICING_TIERS[tierId]
  if (!tier) {
    throw new Error(`Invalid tier: ${tierId}`)
  }

  const priceId = billingCycle === 'yearly' 
    ? tier.stripeYearlyPriceId 
    : tier.stripeMonthlyPriceId

  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price: priceId,
        quantity: 1,
      }],
      payment_behavior: 'create_if_missing',
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        tier: tierId,
        billing_cycle: billingCycle,
      },
    })

    return subscription
  } catch (error) {
    console.error('Subscription creation failed:', error)
    throw error
  }
}

export async function updateSubscription(
  subscriptionId: string,
  newTierId: string
) {
  const newTier = PRICING_TIERS[newTierId]
  if (!newTier) {
    throw new Error(`Invalid tier: ${newTierId}`)
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const currentTierId = subscription.metadata?.tier

    // If upgrading or downgrading, create a new subscription item
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newTier.stripeMonthlyPriceId,
      }],
      metadata: {
        tier: newTierId,
      },
      proration_behavior: 'create_prorations',
    })

    return updatedSubscription
  } catch (error) {
    console.error('Subscription update failed:', error)
    throw error
  }
}

export async function cancelSubscription(subscriptionId: string, immediate = false) {
  try {
    if (immediate) {
      const subscription = await stripe.subscriptions.cancel(subscriptionId)
      return subscription
    } else {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      })
      return subscription
    }
  } catch (error) {
    console.error('Subscription cancellation failed:', error)
    throw error
  }
}

export async function createCustomer(email: string, name?: string) {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        source: 'accessibility-navigator',
      },
    })

    return customer
  } catch (error) {
    console.error('Customer creation failed:', error)
    throw error
  }
}

export async function getCustomerSubscription(customerId: string): Promise<SubscriptionInfo | null> {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    })

    if (subscriptions.data.length === 0) {
      return null
    }

    const subscription = subscriptions.data[0]
    const tierId = subscription.metadata?.tier || 'starter'
    const tier = PRICING_TIERS[tierId]

    // Usage would come from your database
    const usage = {
      scansThisMonth: 0, // Get from your usage tracking
      sitesTracked: 0,   // Get from your usage tracking
    }

    return {
      id: subscription.id,
      customerId: subscription.customer as string,
      tier: tierId,
      status: subscription.status as any,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      usage,
    }
  } catch (error) {
    console.error('Failed to get customer subscription:', error)
    return null
  }
}

export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'invoice.payment_succeeded':
      const invoice = event.data.object as Stripe.Invoice
      console.log('Payment succeeded for invoice:', invoice.id)
      // Update subscription status in your database
      break

    case 'invoice.payment_failed':
      const failedInvoice = event.data.object as Stripe.Invoice
      console.log('Payment failed for invoice:', failedInvoice.id)
      // Notify customer of failed payment
      break

    case 'customer.subscription.created':
      const createdSubscription = event.data.object as Stripe.Subscription
      console.log('Subscription created:', createdSubscription.id)
      // Update user's subscription in your database
      break

    case 'customer.subscription.updated':
      const updatedSubscription = event.data.object as Stripe.Subscription
      console.log('Subscription updated:', updatedSubscription.id)
      // Update user's subscription in your database
      break

    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object as Stripe.Subscription
      console.log('Subscription deleted:', deletedSubscription.id)
      // Update user's subscription in your database
      break

    default:
      console.log(`Unhandled event type: ${event.type}`)
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