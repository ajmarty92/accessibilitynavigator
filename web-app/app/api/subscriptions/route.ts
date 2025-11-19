import { NextRequest, NextResponse } from 'next/server'
import { 
  createSubscription, 
  createCustomer, 
  getCustomerSubscription,
  updateSubscription,
  cancelSubscription,
  handleStripeWebhook,
  PRICING_TIERS 
} from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const { action, tierId, billingCycle, customerId, email, name } = await request.json()

    switch (action) {
      case 'create':
        if (!tierId) {
          return NextResponse.json({ error: 'Tier ID is required' }, { status: 400 })
        }

        // Create or get customer
        let customer
        if (customerId) {
          // Use existing customer
          customer = { id: customerId }
        } else if (email) {
          // Create new customer
          customer = await createCustomer(email, name)
        } else {
          return NextResponse.json({ error: 'Customer ID or email is required' }, { status: 400 })
        }

        const subscription = await createSubscription(
          customer.id,
          tierId,
          billingCycle || 'monthly'
        )

        return NextResponse.json({ 
          subscription, 
          customer,
          tier: PRICING_TIERS[tierId] 
        })

      case 'update':
        if (!customerId || !tierId) {
          return NextResponse.json({ error: 'Customer ID and tier ID are required' }, { status: 400 })
        }

        const existingSubscription = await getCustomerSubscription(customerId)
        if (!existingSubscription) {
          return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
        }

        const updatedSubscription = await updateSubscription(
          existingSubscription.stripeSubscriptionId,
          tierId
        )

        return NextResponse.json({ 
          subscription: updatedSubscription,
          tier: PRICING_TIERS[tierId]
        })

      case 'cancel':
        if (!customerId) {
          return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 })
        }

        const activeSubscription = await getCustomerSubscription(customerId)
        if (!activeSubscription) {
          return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
        }

        const canceledSubscription = await cancelSubscription(
          activeSubscription.stripeSubscriptionId,
          false // Cancel at period end by default
        )

        return NextResponse.json({ subscription: canceledSubscription })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Subscription API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 })
    }

    const subscription = await getCustomerSubscription(customerId)
    if (!subscription) {
      return NextResponse.json({ subscription: null })
    }

    return NextResponse.json({ 
      subscription,
      tier: PRICING_TIERS[subscription.tier]
    })
  } catch (error) {
    console.error('Get subscription error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle Stripe webhooks
export async function PUT(request: NextRequest) {
  try {
    const event = await request.json()
    await handleStripeWebhook(event)
    
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    )
  }
}