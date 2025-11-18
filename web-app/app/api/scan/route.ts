import { NextRequest, NextResponse } from 'next/server'
import { scanWebsite, detectFramework, scanMultiplePages, ScanOptions } from '@/lib/scanner'
import { analyzeViolationsWithAI, SiteContext } from '@/lib/ai-prioritizer'
import { trackScanUsage } from '@/lib/paddle'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { 
      url, 
      options = {}, 
      siteContext = {},
      userId,
      useAI = true 
    } = await request.json()

    // Validate URL
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Valid URL is required' },
        { status: 400 }
      )
    }

    // Format URL properly
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`
    const urlObj = new URL(formattedUrl)
    
    // Track usage for subscription limits
    if (userId) {
      try {
        await trackScanUsage(userId)
      } catch (usageError) {
        return NextResponse.json(
          { error: usageError instanceof Error ? usageError.message : 'Usage limit exceeded' },
          { status: 403 }
        )
      }
    }

    // Enhanced scan options
    const scanOptions: ScanOptions = {
      maxPages: options.maxPages || 1,
      crawlDepth: options.crawlDepth || 1,
      includePerformance: options.includePerformance !== false,
      customRules: options.customRules !== false,
      framework: options.framework || 'vanilla'
    }

    let scanResult
    
    // Auto-detect framework if not specified
    if (!options.framework) {
      try {
        scanOptions.framework = await detectFramework(formattedUrl)
      } catch (error) {
        console.error('Framework detection failed, using vanilla:', error)
        scanOptions.framework = 'vanilla'
      }
    }

    // Perform the scan
    if (scanOptions.maxPages > 1) {
      // Multi-page scan
      const results = await scanMultiplePages(formattedUrl, scanOptions)
      
      // Merge results from multiple pages
      scanResult = {
        violations: results.flatMap(r => r.violations),
        passes: results.flatMap(r => r.passes),
        incomplete: results.flatMap(r => r.incomplete),
        url: formattedUrl,
        timestamp: new Date().toISOString(),
        scanDuration: results.reduce((total, r) => total + r.scanDuration, 0),
        metadata: {
          title: results[0]?.metadata?.title,
          viewport: results[0]?.metadata?.viewport || { width: 1280, height: 720 },
          userAgent: results[0]?.metadata?.userAgent,
          pagesScanned: results.length,
          framework: scanOptions.framework
        },
        performanceMetrics: {
          accessibilityScore: results.reduce((sum, r) => sum + (r.performanceMetrics?.accessibilityScore || 0), 0) / results.length,
          performanceScore: results.reduce((sum, r) => sum + (r.performanceMetrics?.performanceScore || 0), 0) / results.length,
          bestPracticesScore: results.reduce((sum, r) => sum + (r.performanceMetrics?.bestPracticesScore || 0), 0) / results.length
        }
      }
    } else {
      // Single page scan
      scanResult = await scanWebsite(formattedUrl, scanOptions)
      scanResult.metadata = {
        ...scanResult.metadata,
        framework: scanOptions.framework
      }
    }

    // AI-powered analysis if requested
    let aiAnalysis = null
    if (useAI && scanResult.violations.length > 0) {
      try {
        aiAnalysis = await analyzeViolationsWithAI(scanResult.violations, siteContext)
        
        // Attach AI analysis to violations
        scanResult.violations = scanResult.violations.map((violation, index) => ({
          ...violation,
          aiAnalysis: aiAnalysis[index] || null
        }))
      } catch (error) {
        console.error('AI analysis failed:', error)
        // Continue without AI analysis
      }
    }

    // Save to database if user is authenticated
    let savedScan = null
    if (userId && prisma) {
      try {
        savedScan = await prisma.scan.create({
          data: {
            url: formattedUrl,
            userId,
            violations: scanResult.violations.length,
            passes: scanResult.passes.length,
            score: scanResult.performanceMetrics?.accessibilityScore || 0,
            metadata: scanResult.metadata,
            results: scanResult,
            aiAnalysis: aiAnalysis
          }
        })
      } catch (error) {
        console.error('Failed to save scan to database:', error)
        // Continue without saving
      }
    }

    // Prepare response
    const response = {
      success: true,
      scan: {
        id: savedScan?.id,
        ...scanResult,
        hasAIPrioritization: !!aiAnalysis,
        framework: scanOptions.framework,
        siteContext
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Scan API error:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Internal server error'
    let statusCode = 500
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = 'Website scan timed out. Please try again or contact support.'
        statusCode = 408
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Unable to reach the website. Please check the URL and try again.'
        statusCode = 400
      } else if (error.message.includes('SSL') || error.message.includes('certificate')) {
        errorMessage = 'Website has SSL certificate issues. Please contact the website administrator.'
        statusCode = 400
      } else {
        errorMessage = error.message
      }
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: statusCode }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const scanId = searchParams.get('id')
    const userId = searchParams.get('userId')

    if (!scanId) {
      return NextResponse.json(
        { error: 'Scan ID is required' },
        { status: 400 }
      )
    }

    // Retrieve scan from database
    if (prisma) {
      const scan = await prisma.scan.findUnique({
        where: { id: scanId },
        include: {
          user: userId ? { where: { id: userId } } : false
        }
      })

      if (!scan) {
        return NextResponse.json(
          { error: 'Scan not found' },
          { status: 404 }
        )
      }

      // Check if user has access to this scan
      if (userId && scan.userId !== userId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }

      return NextResponse.json({
        success: true,
        scan: {
          id: scan.id,
          url: scan.url,
          timestamp: scan.createdAt,
          violations: scan.results?.violations || [],
          passes: scan.results?.passes || [],
          incomplete: scan.results?.incomplete || [],
          score: scan.score,
          metadata: scan.metadata,
          aiAnalysis: scan.aiAnalysis
        }
      })
    }

    // Fallback if no database
    return NextResponse.json(
      { error: 'Database not available' },
      { status: 503 }
    )
  } catch (error) {
    console.error('Get scan error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// Endpoint to get scan history for a user
export async function PUT(request: NextRequest) {
  try {
    const { userId, limit = 10, offset = 0 } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (prisma) {
      const scans = await prisma.scan.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        select: {
          id: true,
          url: true,
          createdAt: true,
          violations: true,
          passes: true,
          score: true,
          metadata: true
        }
      })

      const total = await prisma.scan.count({
        where: { userId }
      })

      return NextResponse.json({
        success: true,
        scans,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: offset + scans.length < total
        }
      })
    }

    return NextResponse.json(
      { error: 'Database not available' },
      { status: 503 }
    )
  } catch (error) {
    console.error('Get scan history error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}