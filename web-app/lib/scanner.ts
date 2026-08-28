import puppeteer from 'puppeteer'
import { AxePuppeteer } from '@axe-core/puppeteer'
import { mergeViolations } from './violation-utils'

export interface ScanResult {
  violations: any[]
  passes: any[]
  incomplete: any[]
  url: string
  timestamp: string
  scanDuration: number
  metadata: {
    title?: string
    viewport: { width: number; height: number }
    userAgent: string
  }
  performanceMetrics?: {
    domContentLoaded?: number
    loadComplete?: number
    firstPaint?: number
    firstContentfulPaint?: number
    coverage?: {
      css: any
      js: any
    }
  }
}

export interface ScanOptions {
  maxPages?: number
  crawlDepth?: number
  includePerformance?: boolean
  customRules?: boolean
  framework?: 'react' | 'vue' | 'angular' | 'vanilla'
}

export async function scanWebsite(url: string, options: ScanOptions = {}): Promise<ScanResult> {
  const {
    maxPages = 1,
    crawlDepth = 1,
    includePerformance = true,
    customRules = true,
    framework = 'vanilla'
  } = options

  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  const startTime = Date.now()
  
  try {
    const page = await browser.newPage()
    
    // Set viewport for consistent scanning
    await page.setViewport({ width: 1280, height: 720 })
    
    // Enable performance monitoring
    if (includePerformance) {
      await Promise.all([
        page.coverage.startCSSCoverage(),
        page.coverage.startJSCoverage()
      ])
    }
    
    // Navigate to the URL
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    })
    
    // Wait for dynamic content
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get page metadata
    const metadata = await page.evaluate(() => ({
      title: document.title,
      userAgent: navigator.userAgent
    }))
    
    // Run axe-core accessibility scan
    const axeResults = await new AxePuppeteer(page)
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .withRules(['color-contrast', 'keyboard-navigation', 'aria-labels'])
      .analyze()
    
    // Run custom accessibility checks
    let customResults: { violations: any[]; passes: any[] } = { violations: [], passes: [] }
    if (customRules) {
      customResults = await runCustomAccessibilityChecks(page, framework)
    }
    
    // Get performance metrics
    let performanceMetrics
    if (includePerformance) {
      performanceMetrics = await getPerformanceMetrics(page, url)
      
      // Stop coverage
      const [cssCoverage, jsCoverage] = await Promise.all([
        page.coverage.stopCSSCoverage(),
        page.coverage.stopJSCoverage()
      ])
      
      performanceMetrics.coverage = {
        css: cssCoverage,
        js: jsCoverage
      }
    }
    
    // Merge results
    const mergedViolations = mergeViolations(axeResults.violations, customResults.violations)
    const mergedPasses = [...axeResults.passes, ...customResults.passes]
    
    const scanDuration = Date.now() - startTime
    
    return {
      violations: mergedViolations,
      passes: mergedPasses,
      incomplete: axeResults.incomplete || [],
      url,
      timestamp: new Date().toISOString(),
      scanDuration,
      metadata: {
        ...metadata,
        viewport: { width: 1280, height: 720 }
      },
      performanceMetrics
    }
  } finally {
    await browser.close()
  }
}

async function runCustomAccessibilityChecks(page: any, framework: string): Promise<{ violations: any[], passes: any[] }> {
  const customChecks = await page.evaluate((framework: string) => {
    const results = {
      'react-aria-compliance': [] as any[],
      'enhanced-color-contrast': [] as any[],
      'screen-reader-navigation': [] as any[],
      'form-accessibility': [] as any[],
      'focus-management': [] as any[]
    };

    // React-specific checks
    if (framework === 'react') {
      const issues: any[] = []
      const reactElements = document.querySelectorAll('[data-reactroot], [class*="react"], [id*="react"]')
      
      reactElements.forEach((element, index) => {
        if (element.getAttribute('role') && !element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')) {
          issues.push({
            id: `react-aria-${index}`,
            description: 'React element with role missing aria-label or aria-labelledby',
            impact: 'moderate',
            element: element.outerHTML.substring(0, 100),
            wcagReference: 'WCAG 4.1.2'
          })
        }
      })
      results['react-aria-compliance'] = issues;
    }

    // Enhanced color contrast check
    {
      const issues: any[] = []
      const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, a, button')
      
      textElements.forEach((element, index) => {
        const styles = window.getComputedStyle(element)
        const fontSize = parseFloat(styles.fontSize)
        const fontWeight = styles.fontWeight
        
        // Check for small text with insufficient contrast
        if (fontSize < 16 && fontWeight !== 'bold' && fontWeight !== '700') {
          const color = styles.color
          const backgroundColor = styles.backgroundColor || window.getComputedStyle(element.parentElement || document.documentElement).backgroundColor
          
          // Simple contrast check (would need proper color contrast library in production)
          if (color === 'rgb(128, 128, 128)' && backgroundColor === 'rgb(255, 255, 255)') {
            issues.push({
              id: `contrast-${index}`,
              description: 'Small gray text on white background may not meet contrast requirements',
              impact: 'moderate',
              element: element.outerHTML.substring(0, 100),
              wcagReference: 'WCAG 1.4.3'
            })
          }
        }
      })
      results['enhanced-color-contrast'] = issues;
    }

    // Screen reader navigation check
    {
      const issues: any[] = []
      
      // Check for proper heading structure
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      let previousLevel = 0
      
      headings.forEach((heading, index) => {
        const currentLevel = parseInt(heading.tagName.substring(1))
        if (currentLevel > previousLevel + 1) {
          issues.push({
            id: `heading-skip-${index}`,
            description: `Heading level skipped: H${previousLevel} to H${currentLevel}`,
            impact: 'moderate',
            element: heading.outerHTML,
            wcagReference: 'WCAG 1.3.1'
          })
        }
        previousLevel = currentLevel
      })
      
      // Check for skip navigation links
      if (!document.querySelector('a[href^="#main"], a[href^="#content"], [role="navigation"] a[href^="#"]')) {
        issues.push({
          id: 'skip-navigation',
          description: 'Missing skip navigation link for screen readers',
          impact: 'moderate',
          element: '<body>',
          wcagReference: 'WCAG 2.4.1'
        })
      }
      results['screen-reader-navigation'] = issues;
    }

    // Form accessibility check
    {
      const issues: any[] = []
      const forms = document.querySelectorAll('form')
      
      forms.forEach((form, formIndex) => {
        const inputs = form.querySelectorAll('input, select, textarea')
        
        inputs.forEach((input, inputIndex) => {
          // Check for labels
          const id = input.getAttribute('id')
          const hasLabel = document.querySelector(`label[for="${id}"]`) || 
                          input.getAttribute('aria-label') || 
                          input.getAttribute('aria-labelledby')
          
          if (!hasLabel && (input as HTMLInputElement).type !== 'hidden') {
            issues.push({
              id: `form-label-${formIndex}-${inputIndex}`,
              description: 'Form input missing associated label or aria-label',
              impact: 'serious',
              element: input.outerHTML,
              wcagReference: 'WCAG 3.3.2'
            })
          }
          
          // Check for required field indicators
          if (input.hasAttribute('required')) {
            const ariaRequired = input.getAttribute('aria-required')
            if (!ariaRequired) {
              issues.push({
                id: `required-aria-${formIndex}-${inputIndex}`,
                description: 'Required field missing aria-required attribute',
                impact: 'minor',
                element: input.outerHTML,
                wcagReference: 'WCAG 3.3.3'
              })
            }
          }
        })
        
        // Check for form validation
        const submitButton = form.querySelector('input[type="submit"], button[type="submit"]')
        if (submitButton && !form.getAttribute('novalidate')) {
          // Check for error handling mechanisms
          const hasErrorHandling = form.querySelector('[aria-invalid], [role="alert"], [class*="error"]')
          if (!hasErrorHandling) {
            issues.push({
              id: `form-validation-${formIndex}`,
              description: 'Form missing validation error handling',
              impact: 'moderate',
              element: form.outerHTML.substring(0, 100),
              wcagReference: 'WCAG 3.3.1'
            })
          }
        }
      })
      results['form-accessibility'] = issues;
    }

    // Focus management check
    {
      const issues: any[] = []
      
      // Check for visible focus indicators
      const styleSheet = Array.from(document.styleSheets)
      let hasFocusStyles = false
      
      styleSheet.forEach(sheet => {
        try {
          Array.from(sheet.cssRules || []).forEach(rule => {
            if (rule.cssText.includes(':focus') && rule.cssText.includes('outline')) {
              hasFocusStyles = true
            }
          })
        } catch (e) {
          // Skip external stylesheets with CORS issues
        }
      })
      
      if (!hasFocusStyles) {
        issues.push({
          id: 'focus-indicator',
          description: 'Missing visible focus indicators for keyboard navigation',
          impact: 'serious',
          element: '<style>',
          wcagReference: 'WCAG 2.4.7'
        })
      }
      
      // Check for focus trapping in modals
      const modals = document.querySelectorAll('[role="dialog"], .modal, [aria-modal="true"]')
      modals.forEach((modal, index) => {
        const focusableElements = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        
        if (focusableElements.length === 0) {
          issues.push({
            id: `modal-focus-trap-${index}`,
            description: 'Modal dialog lacks focusable elements or focus trapping',
            impact: 'serious',
            element: modal.outerHTML.substring(0, 100),
            wcagReference: 'WCAG 2.1.1'
          })
        }
      })
      results['focus-management'] = issues;
    }

    return results;
  }, framework);

  const violations = [
    ...customChecks['react-aria-compliance'],
    ...customChecks['enhanced-color-contrast'],
    ...customChecks['screen-reader-navigation'],
    ...customChecks['form-accessibility'],
    ...customChecks['focus-management']
  ]

  const passes = [
    {
      id: 'custom-checks-completed',
      description: 'Custom accessibility checks completed successfully',
      impact: 'minor',
      wcagReference: 'Custom'
    }
  ]

  return { violations, passes }
}

async function getPerformanceMetrics(page: any, url: string): Promise<any> {
  try {
    // Real Navigation Timing / Paint Timing values only. Accessibility and
    // "best practices" scores are NOT computed here — a page-load metric
    // has no bearing on WCAG compliance. The compliance score is derived
    // from actual scan violations in lib/compliance-score.ts instead.
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint')[1]?.startTime || 0,
      }
    })

    return metrics
  } catch (error) {
    console.error('Performance metrics collection failed:', error)
    return null
  }
}

// Framework detection
export async function detectFramework(url: string): Promise<'react' | 'vue' | 'angular' | 'vanilla'> {
  const browser = await puppeteer.launch({ headless: true })
  
  try {
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle2' })
    
    const framework = await page.evaluate(() => {
      // Check for React
      if (window.React || document.querySelector('[data-reactroot]') || 
          Array.from(document.querySelectorAll('*')).some(el => el.getAttribute('class')?.includes('react'))) {
        return 'react'
      }
      
      // Check for Vue
      if ((window as any).Vue || document.querySelector('[data-v-]') ||
          Array.from(document.querySelectorAll('*')).some(el => el.getAttribute('data-v-'))) {
        return 'vue'
      }

      // Check for Angular
      if ((window as any).angular || document.querySelector('[ng-app], [ng-controller]') ||
          Array.from(document.querySelectorAll('*')).some(el => el.getAttribute('ng-'))) {
        return 'angular'
      }
      
      return 'vanilla'
    })
    
    return framework as any
  } finally {
    await browser.close()
  }
}

// --- Page discovery for multi-page scans -----------------------------------
//
// Prefers sitemap.xml (fast, authoritative, and what a real audit tool
// should check first) and falls back to a breadth-first crawl of same-origin
// links, honoring crawlDepth (previously accepted as an option but never
// actually used — the old implementation only ever looked at links found on
// the first page) and robots.txt Disallow rules.

function normalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw)
    u.hash = ''
    u.search = ''
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1)
    }
    return u.toString()
  } catch {
    return null
  }
}

async function fetchRobotsDisallowRules(origin: string): Promise<string[]> {
  try {
    const response = await fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) return []

    const text = await response.text()
    const disallowed: string[] = []
    let inWildcardBlock = false

    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue

      const [directive, ...rest] = line.split(':')
      const value = rest.join(':').trim()
      const key = directive.trim().toLowerCase()

      if (key === 'user-agent') {
        inWildcardBlock = value === '*'
      } else if (key === 'disallow' && inWildcardBlock && value) {
        disallowed.push(value)
      }
    }

    return disallowed
  } catch {
    // robots.txt missing or unreachable — treat as no restrictions
    return []
  }
}

function isDisallowed(url: string, disallowRules: string[]): boolean {
  if (disallowRules.length === 0) return false
  try {
    const path = new URL(url).pathname
    return disallowRules.some(rule => path.startsWith(rule))
  } catch {
    return false
  }
}

// Pulls page URLs out of a sitemap.xml (or a sitemap index, one level deep).
// Uses a plain regex over <loc> tags rather than pulling in an XML parser
// dependency for what is a very constrained, well-known document shape.
async function fetchSitemapUrls(origin: string, maxUrls: number): Promise<string[]> {
  const extractLocs = (xml: string): string[] =>
    Array.from(xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)).map(m => m[1])

  try {
    const response = await fetch(`${origin}/sitemap.xml`, { signal: AbortSignal.timeout(8000) })
    if (!response.ok) return []

    const xml = await response.text()
    let locs = extractLocs(xml)

    // A sitemap index references child sitemaps instead of pages directly.
    const childSitemaps = locs.filter(loc => loc.endsWith('.xml')).slice(0, 3)
    if (childSitemaps.length > 0) {
      const childUrls = await Promise.all(
        childSitemaps.map(async childUrl => {
          try {
            const childResponse = await fetch(childUrl, { signal: AbortSignal.timeout(8000) })
            if (!childResponse.ok) return []
            return extractLocs(await childResponse.text())
          } catch {
            return []
          }
        })
      )
      locs = childUrls.flat()
    }

    return locs.slice(0, maxUrls * 2) // over-fetch a bit; caller filters/dedupes
  } catch {
    return []
  }
}

async function bfsCrawl(
  baseUrl: string,
  maxPages: number,
  crawlDepth: number,
  disallowRules: string[]
): Promise<string[]> {
  const origin = new URL(baseUrl).origin
  const start = normalizeUrl(baseUrl)
  if (!start) return [baseUrl]

  const visited = new Set<string>()
  const discovered: string[] = []
  const queue: { url: string; depth: number }[] = [{ url: start, depth: 0 }]

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  try {
    const page = await browser.newPage()

    while (queue.length > 0 && discovered.length < maxPages) {
      const next = queue.shift()!
      if (visited.has(next.url) || isDisallowed(next.url, disallowRules)) continue
      visited.add(next.url)
      discovered.push(next.url)

      if (next.depth >= crawlDepth || discovered.length >= maxPages) continue

      try {
        await page.goto(next.url, { waitUntil: 'networkidle2', timeout: 20000 })
        const links: string[] = await page.evaluate(() =>
          Array.from(document.querySelectorAll('a[href]')).map(a => (a as HTMLAnchorElement).href)
        )

        for (const link of links) {
          const normalized = normalizeUrl(link)
          if (normalized && normalized.startsWith(origin) && !visited.has(normalized)) {
            queue.push({ url: normalized, depth: next.depth + 1 })
          }
        }
      } catch (error) {
        // Page in the queue failed to load during discovery — it's still
        // kept as a discovered URL to attempt scanning, just without
        // contributing further links to the crawl.
        console.error(`Crawl discovery failed for ${next.url}:`, error)
      }
    }

    return discovered
  } finally {
    await browser.close()
  }
}

export interface DiscoveredPages {
  urls: string[]
  source: 'sitemap' | 'crawl'
}

export async function discoverPages(
  baseUrl: string,
  maxPages: number,
  crawlDepth: number
): Promise<DiscoveredPages> {
  const origin = new URL(baseUrl).origin
  const disallowRules = await fetchRobotsDisallowRules(origin)

  const sitemapUrls = await fetchSitemapUrls(origin, maxPages)
  if (sitemapUrls.length > 0) {
    const base = normalizeUrl(baseUrl)
    const filtered = sitemapUrls
      .map(normalizeUrl)
      .filter((u): u is string => !!u && u.startsWith(origin) && !isDisallowed(u, disallowRules))

    const ordered = base ? [base, ...filtered.filter(u => u !== base)] : filtered
    const deduped = Array.from(new Set(ordered)).slice(0, maxPages)

    if (deduped.length > 0) {
      return { urls: deduped, source: 'sitemap' }
    }
  }

  const crawled = await bfsCrawl(baseUrl, maxPages, crawlDepth, disallowRules)
  return { urls: crawled, source: 'crawl' }
}

// Multi-page scanning for comprehensive analysis
export async function scanMultiplePages(
  baseUrl: string,
  options: ScanOptions = {}
): Promise<{ results: ScanResult[]; discoveryMethod: 'sitemap' | 'crawl' }> {
  const { maxPages = 5, crawlDepth = 2 } = options

  const { urls, source } = await discoverPages(baseUrl, maxPages, crawlDepth)

  const results: ScanResult[] = []
  for (const url of urls) {
    try {
      const result = await scanWebsite(url, options)
      results.push(result)
    } catch (error) {
      console.error(`Failed to scan ${url}:`, error)
    }
  }

  return { results, discoveryMethod: source }
}
