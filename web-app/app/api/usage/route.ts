import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserUsage, getUsageStats, isFeatureAvailable, recordUsageEvent } from '@/lib/usage-tracking'

// Reads the caller's session on every request — never statically
// pre-rendered/cached, or every user would see the same response.
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }
    const userId = session.user.id

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'basic' | 'stats' | 'feature'

    switch (type) {
      case 'stats':
        const stats = await getUsageStats(userId)
        return NextResponse.json(stats)

      case 'feature':
        const feature = searchParams.get('feature')
        if (!feature) {
          return NextResponse.json(
            { error: 'feature parameter is required for feature check' },
            { status: 400 }
          )
        }
        const isAvailable = await isFeatureAvailable(userId, feature as any)
        return NextResponse.json({ available: isAvailable })

      case 'basic':
      default:
        const usage = await getUserUsage(userId)
        return NextResponse.json(usage)
    }

  } catch (error) {
    console.error('Usage tracking error:', error)
    return NextResponse.json(
      { error: 'Failed to get usage information' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const body = await request.json()
    const { eventType, metadata } = body

    if (!eventType) {
      return NextResponse.json(
        { error: 'eventType is required' },
        { status: 400 }
      )
    }

    await recordUsageEvent(session.user.id, eventType, metadata)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Failed to record usage event:', error)
    return NextResponse.json(
      { error: 'Failed to record usage event' },
      { status: 500 }
    )
  }
}
