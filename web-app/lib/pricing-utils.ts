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
  paddleMonthlyPriceId?: string
  paddleYearlyPriceId?: string
  stripeMonthlyPriceId?: string
  stripeYearlyPriceId?: string
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
    paddleYearlyPriceId: 'pri_01hgx4q2g2q8m4n8h2k6j7q7j9',
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
    paddleMonthlyPriceId: 'pri_01hgx4q2g2q8m4n8h2k6j7q7ja',
    paddleYearlyPriceId: 'pri_01hgx4q2g2q8m4n8h2k6j7q7jb',
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
    paddleMonthlyPriceId: 'pri_01hgx4q2g2q8m4n8h2k6j7q7jc',
    paddleYearlyPriceId: 'pri_01hgx4q2g2q8m4n8h2k6j7q7jd',
    stripeMonthlyPriceId: 'price_enterprise_monthly',
    stripeYearlyPriceId: 'price_enterprise_yearly'
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
