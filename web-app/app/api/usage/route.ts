import { NextRequest, NextResponse } from 'next/server'
import { getUserUsage, getUsageStats, isFeatureAvailable, recordUsageEvent } from '@/lib/usage-tracking'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') // 'basic' | 'stats' | 'feature'

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

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
    const body = await request.json()
    const { userId, eventType, metadata } = body

    if (!userId || !eventType) {
      return NextResponse.json(
        { error: 'userId and eventType are required' },
        { status: 400 }
      )
    }

    await recordUsageEvent(userId, eventType, metadata)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Failed to record usage event:', error)
    return NextResponse.json(
      { error: 'Failed to record usage event' },
      { status: 500 }
    )
  }
}