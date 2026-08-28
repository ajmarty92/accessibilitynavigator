import { NextRequest, NextResponse } from 'next/server'
import {
  createSubscription,
  createCustomer,
  updateSubscription,
  cancelSubscription,
  getSubscriptionPeriodEnd,
  PRICING_TIERS
} from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { requireOrganizationContext, isOrganizationAdmin } from '@/lib/organizations'
import { logger } from '@/lib/logger'

// Reads the caller's session on every request — never statically
// pre-rendered/cached, or every user would see the same response.
export const dynamic = 'force-dynamic'

// Billing affects the whole organization, so changing it is restricted to
// owners/admins rather than any member.
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    if (!(await isOrganizationAdmin(ctx.userId, ctx.organizationId))) {
      return NextResponse.json({ error: 'Only organization owners/admins can manage billing' }, { status: 403 })
    }

    const { action, tierId, billingCycle } = await request.json()
    const [organization, user] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: ctx.organizationId },
        include: { subscription: true },
      }),
      prisma.user.findUnique({ where: { id: ctx.userId } }),
    ])
    if (!organization || !user) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    switch (action) {
      case 'create': {
        if (!tierId || !PRICING_TIERS[tierId]) {
          return NextResponse.json({ error: 'Valid tier ID is required' }, { status: 400 })
        }

        let stripeCustomerId = organization.stripeCustomerId
        if (!stripeCustomerId) {
          const customer = await createCustomer(user.email, organization.name)
          stripeCustomerId = customer.id
          await prisma.organization.update({
            where: { id: organization.id },
            data: { stripeCustomerId },
          })
        }

        const subscription = await createSubscription(
          stripeCustomerId,
          tierId,
          billingCycle === 'yearly' ? 'yearly' : 'monthly'
        )

        await prisma.subscription.upsert({
          where: { organizationId: organization.id },
          update: {
            stripeSubscriptionId: subscription.id,
            tier: tierId,
            status: subscription.status,
            currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
          create: {
            organizationId: organization.id,
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
        if (!organization.subscription) {
          return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
        }
        if (!tierId || !PRICING_TIERS[tierId]) {
          return NextResponse.json({ error: 'Valid tier ID is required' }, { status: 400 })
        }

        const updated = await updateSubscription(organization.subscription.stripeSubscriptionId, tierId)

        await prisma.subscription.update({
          where: { organizationId: organization.id },
          data: { tier: tierId, status: updated.status },
        })

        return NextResponse.json({ subscription: updated, tier: PRICING_TIERS[tierId] })
      }

      case 'cancel': {
        if (!organization.subscription) {
          return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
        }

        const canceled = await cancelSubscription(organization.subscription.stripeSubscriptionId, false)

        await prisma.subscription.update({
          where: { organizationId: organization.id },
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
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: ctx.organizationId },
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
