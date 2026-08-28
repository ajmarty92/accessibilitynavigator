import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { checkRateLimit } from '@/lib/rate-limit'
import { createPersonalOrganization } from '@/lib/organizations'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 })
    }
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Prevent scripted mass account creation from a single source.
    const ip = getClientIp(request)
    const rateLimit = await checkRateLimit(`register:${ip}`, 5, 60 * 60 * 1000)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const normalizedEmail = email.trim().toLowerCase()
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const trimmedName = typeof name === 'string' && name.trim() ? name.trim() : null

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: passwordHash,
        name: trimmedName,
      },
      select: { id: true, email: true, name: true },
    })

    // Every account needs an organization to own its scans/billing/API
    // keys — a fresh signup gets a personal one automatically so there's
    // no separate "solo user" path through the rest of the app.
    await createPersonalOrganization(user.id, trimmedName || normalizedEmail.split('@')[0])

    return NextResponse.json({ success: true, user })
  } catch (error) {
    logger.error('Registration failed:', error)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
