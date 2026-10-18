import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateStatementContent } from '@/lib/accessibility-statement-generator'
import { logger } from '@/lib/logger'

// Reads from the database on every request — never statically
// pre-rendered/cached, since a statement can be unpublished at any time.
export const dynamic = 'force-dynamic'

// GET /api/statements/[slug] — public, unauthenticated. Only serves
// published statements; this is meant to be linked from the customer's own
// site or shared directly with regulators/plaintiffs' counsel, so it must
// not require an Accessibility Navigator login to view.
export async function GET(request: Request, { params }: { params: { slug: string } }) {
  try {
    const statement = await prisma.accessibilityStatement.findUnique({
      where: { slug: params.slug },
      include: {
        scan: { include: { violations: true, manualAuditItems: true } },
      },
    })

    if (!statement || !statement.published) {
      return NextResponse.json({ error: 'Statement not found' }, { status: 404 })
    }

    const content = generateStatementContent({
      organizationName: statement.organizationName,
      siteUrl: statement.siteUrl,
      complianceScore: statement.scan.complianceScore,
      violations: statement.scan.violations,
      manualAuditItems: statement.scan.manualAuditItems,
      contactEmail: statement.contactEmail,
      contactPhone: statement.contactPhone,
      customNotes: statement.customNotes,
      assessmentDate: statement.scan.timestamp,
    })

    return NextResponse.json({ content })
  } catch (error) {
    logger.error('Failed to fetch public accessibility statement:', error)
    return NextResponse.json({ error: 'Failed to fetch statement' }, { status: 500 })
  }
}
