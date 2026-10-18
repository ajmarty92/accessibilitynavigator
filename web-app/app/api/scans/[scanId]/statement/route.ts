import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrganizationContext } from '@/lib/organizations'
import { generateStatementContent } from '@/lib/accessibility-statement-generator'
import { generateSlug } from '@/lib/slug'
import { logger } from '@/lib/logger'

// Reads the caller's session on every request — never statically
// pre-rendered/cached, or every user would see the same response.
export const dynamic = 'force-dynamic'

async function loadScanForStatement(scanId: string, organizationId: string) {
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { violations: true, manualAuditItems: true },
  })
  if (!scan || scan.organizationId !== organizationId) return null
  return scan
}

// GET /api/scans/[scanId]/statement — the statement config for this scan's
// site (keyed by organization + URL, so it reflects whichever scan of this
// site was most recently used to refresh it), plus a live content preview
// generated from the current scan.
export async function GET(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    const scan = await loadScanForStatement(params.scanId, ctx.organizationId)
    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }

    const statement = await prisma.accessibilityStatement.findUnique({
      where: { organizationId_siteUrl: { organizationId: ctx.organizationId, siteUrl: scan.url } },
    })

    const content = generateStatementContent({
      organizationName: statement?.organizationName || '',
      siteUrl: scan.url,
      complianceScore: scan.complianceScore,
      violations: scan.violations,
      manualAuditItems: scan.manualAuditItems,
      contactEmail: statement?.contactEmail,
      contactPhone: statement?.contactPhone,
      customNotes: statement?.customNotes,
      assessmentDate: scan.timestamp,
    })

    return NextResponse.json({
      statement: statement
        ? {
            id: statement.id,
            slug: statement.slug,
            organizationName: statement.organizationName,
            contactEmail: statement.contactEmail,
            contactPhone: statement.contactPhone,
            customNotes: statement.customNotes,
            published: statement.published,
            updatedAt: statement.updatedAt,
          }
        : null,
      content,
    })
  } catch (error) {
    logger.error('Failed to fetch accessibility statement:', error)
    return NextResponse.json({ error: 'Failed to fetch accessibility statement' }, { status: 500 })
  }
}

// PATCH /api/scans/[scanId]/statement — create or update the statement for
// this scan's site. Upserted by (organizationId, siteUrl) so the public
// slug survives being refreshed from a newer scan.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    const scan = await loadScanForStatement(params.scanId, ctx.organizationId)
    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }

    const { organizationName, contactEmail, contactPhone, customNotes, published } = await request.json()

    if (organizationName !== undefined && (typeof organizationName !== 'string' || !organizationName.trim())) {
      return NextResponse.json({ error: 'organizationName cannot be empty' }, { status: 400 })
    }

    const existing = await prisma.accessibilityStatement.findUnique({
      where: { organizationId_siteUrl: { organizationId: ctx.organizationId, siteUrl: scan.url } },
    })

    const data = {
      scanId: scan.id,
      ...(organizationName !== undefined ? { organizationName: organizationName.trim() } : {}),
      ...(contactEmail !== undefined ? { contactEmail: contactEmail || null } : {}),
      ...(contactPhone !== undefined ? { contactPhone: contactPhone || null } : {}),
      ...(customNotes !== undefined ? { customNotes: customNotes || null } : {}),
      ...(published !== undefined ? { published: !!published } : {}),
    }

    const statement = existing
      ? await prisma.accessibilityStatement.update({ where: { id: existing.id }, data })
      : await prisma.accessibilityStatement.create({
          data: {
            organizationId: ctx.organizationId,
            siteUrl: scan.url,
            slug: generateSlug(organizationName || scan.url),
            organizationName: organizationName?.trim() || '',
            contactEmail: contactEmail || null,
            contactPhone: contactPhone || null,
            customNotes: customNotes || null,
            published: !!published,
            ...data,
          },
        })

    return NextResponse.json({
      statement: {
        id: statement.id,
        slug: statement.slug,
        organizationName: statement.organizationName,
        contactEmail: statement.contactEmail,
        contactPhone: statement.contactPhone,
        customNotes: statement.customNotes,
        published: statement.published,
        updatedAt: statement.updatedAt,
      },
    })
  } catch (error) {
    logger.error('Failed to save accessibility statement:', error)
    return NextResponse.json({ error: 'Failed to save accessibility statement' }, { status: 500 })
  }
}
