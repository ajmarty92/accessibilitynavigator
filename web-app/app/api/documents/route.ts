import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrganizationContext } from '@/lib/organizations'
import { runDocumentScan, mapDocumentScanErrorToResponse } from '@/lib/run-document-scan'
import { logger } from '@/lib/logger'

// Reads the caller's session on every request — never statically
// pre-rendered/cached, or every user would see the same response.
export const dynamic = 'force-dynamic'

// GET /api/documents — the organization's document (PDF) accessibility scans.
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20')

    const documentScans = await prisma.documentScan.findMany({
      where: { organizationId: ctx.organizationId },
      include: {
        violations: { select: { id: true, impact: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    })

    return NextResponse.json({ documentScans })
  } catch (error) {
    logger.error('Failed to list document scans:', error)
    return NextResponse.json({ error: 'Failed to list document scans' }, { status: 500 })
  }
}

// POST /api/documents — upload a PDF (multipart/form-data, field "file")
// and run it through the accessibility checker.
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A PDF file is required' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()

    const result = await runDocumentScan({
      organizationId: ctx.organizationId,
      createdByUserId: ctx.userId,
      fileName: file.name || 'document.pdf',
      fileBuffer: new Uint8Array(arrayBuffer),
    })

    return NextResponse.json({ documentScan: result.savedScan })
  } catch (error) {
    logger.error('Document scan API error:', error)
    const { message, status } = mapDocumentScanErrorToResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
