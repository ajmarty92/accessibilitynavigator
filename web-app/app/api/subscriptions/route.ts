import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  createSubscription,
  createCustomer,
  updateSubscription,
  cancelSubscription,
  getSubscriptionPeriodEnd,
  PRICING_TIERS
} from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const { action, tierId, billingCycle } = await request.json()
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { subscription: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    switch (action) {
      case 'create': {
        if (!tierId || !PRICING_TIERS[tierId]) {
          return NextResponse.json({ error: 'Valid tier ID is required' }, { status: 400 })
        }

        let stripeCustomerId = user.stripeCustomerId
        if (!stripeCustomerId) {
          const customer = await createCustomer(user.email, user.name || undefined)
          stripeCustomerId = customer.id
          await prisma.user.update({
            where: { id: user.id },
            data: { stripeCustomerId },
          })
        }

        const subscription = await createSubscription(
          stripeCustomerId,
          tierId,
          billingCycle === 'yearly' ? 'yearly' : 'monthly'
        )

        await prisma.subscription.upsert({
          where: { userId: user.id },
          update: {
            stripeSubscriptionId: subscription.id,
            tier: tierId,
            status: subscription.status,
            currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
          create: {
            userId: user.id,
            stripeSubscriptionId: subscription.id,
            tier: tierId,
            status: subscription.status,
            currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
        })

        return NextResponse.json({ subscription, tier: PRICING_TIERS[tierId] })
      }

      case 'update': {
        if (!user.subscription) {
          return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
        }
        if (!tierId || !PRICING_TIERS[tierId]) {
          return NextResponse.json({ error: 'Valid tier ID is required' }, { status: 400 })
        }

        const updated = await updateSubscription(user.subscription.stripeSubscriptionId, tierId)

        await prisma.subscription.update({
          where: { userId: user.id },
          data: { tier: tierId, status: updated.status },
        })

        return NextResponse.json({ subscription: updated, tier: PRICING_TIERS[tierId] })
      }

      case 'cancel': {
        if (!user.subscription) {
          return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
        }

        const canceled = await cancelSubscription(user.subscription.stripeSubscriptionId, false)

        await prisma.subscription.update({
          where: { userId: user.id },
          data: {
            status: canceled.status,
            cancelAtPeriodEnd: canceled.cancel_at_period_end,
          },
        })

        return NextResponse.json({ subscription: canceled })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    logger.error('Subscription API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    })

    if (!subscription) {
      return NextResponse.json({ subscription: null })
    }

    return NextResponse.json({
      subscription,
      tier: PRICING_TIERS[subscription.tier],
    })
  } catch (error) {
    logger.error('Get subscription error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
