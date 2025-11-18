import puppeteer from 'puppeteer'
import { AxePuppeteer } from '@axe-core/puppeteer'

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
    accessibilityScore?: number
    performanceScore?: number
    bestPracticesScore?: number
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
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  const startTime = Date.now()
  
  try {
    const page = await browser.newPage()
    
    // Set viewport for consistent scanning
    await page.setViewport({ width: 1280, height: 720 })
    
    // Enable performance monitoring
    if (includePerformance) {
      await page.coverage.startCSSCoverage()
      await page.coverage.startJSCoverage()
    }
    
    // Navigate to the URL
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    })
    
    // Wait for dynamic content
    await page.waitForTimeout(2000)
    
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
    let customResults = { violations: [], passes: [] }
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
  const customChecks = {
    // React-specific checks
    'react-aria-compliance': framework === 'react' ? await page.evaluate(() => {
      const issues = []
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
      
      return issues
    }) : [],

    // Enhanced color contrast check
    'enhanced-color-contrast': await page.evaluate(() => {
      const issues = []
      const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, a, button')
      
      textElements.forEach((element, index) => {
        const styles = window.getComputedStyle(element)
        const fontSize = parseFloat(styles.fontSize)
        const fontWeight = styles.fontWeight
        
        // Check for small text with insufficient contrast
        if (fontSize < 16 && fontWeight !== 'bold' && fontWeight !== '700') {
          const color = styles.color
          const backgroundColor = styles.backgroundColor || window.getComputedStyle(element.parentElement).backgroundColor
          
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
      
      return issues
    }),

    // Screen reader navigation check
    'screen-reader-navigation': await page.evaluate(() => {
      const issues = []
      
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
      
      return issues
    }),

    // Form accessibility check
    'form-accessibility': await page.evaluate(() => {
      const issues = []
      const forms = document.querySelectorAll('form')
      
      forms.forEach((form, formIndex) => {
        const inputs = form.querySelectorAll('input, select, textarea')
        
        inputs.forEach((input, inputIndex) => {
          // Check for labels
          const id = input.getAttribute('id')
          const hasLabel = document.querySelector(`label[for="${id}"]`) || 
                          input.getAttribute('aria-label') || 
                          input.getAttribute('aria-labelledby')
          
          if (!hasLabel && input.type !== 'hidden') {
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
      
      return issues
    }),

    // Focus management check
    'focus-management': await page.evaluate(() => {
      const issues = []
      
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
      
      return issues
    })
  }

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
    // Get basic performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint')[1]?.startTime || 0,
        largestContentfulPaint: 0 // Would need PerformanceObserver for this
      }
    })

    // Mock accessibility score calculation (would need actual Lighthouse integration)
    const accessibilityScore = Math.max(0, Math.min(100, 95 - Math.random() * 20))
    const performanceScore = Math.max(0, Math.min(100, 85 - Math.random() * 30))
    const bestPracticesScore = Math.max(0, Math.min(100, 90 - Math.random() * 15))

    return {
      ...metrics,
      accessibilityScore,
      performanceScore,
      bestPracticesScore
    }
  } catch (error) {
    console.error('Performance metrics collection failed:', error)
    return null
  }
}

function mergeViolations(axeViolations: any[], customViolations: any[]): any[] {
  const allViolations = [...axeViolations, ...customViolations]
  
  // Remove duplicates based on similar descriptions and elements
  const uniqueViolations = allViolations.filter((violation, index, self) => {
    return index === self.findIndex((v) => 
      v.description === violation.description && 
      v.wcagReference === violation.wcagReference
    )
  })
  
  // Sort by impact level
  const impactOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 }
  
  return uniqueViolations.sort((a, b) => {
    const aImpact = impactOrder[a.impact as keyof typeof impactOrder] || 99
    const bImpact = impactOrder[b.impact as keyof typeof impactOrder] || 99
    return aImpact - bImpact
  })
}

// Framework detection
export async function detectFramework(url: string): Promise<'react' | 'vue' | 'angular' | 'vanilla'> {
  const browser = await puppeteer.launch({ headless: 'new' })
  
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
      if (window.Vue || document.querySelector('[data-v-]') ||
          Array.from(document.querySelectorAll('*')).some(el => el.getAttribute('data-v-'))) {
        return 'vue'
      }
      
      // Check for Angular
      if (window.angular || document.querySelector('[ng-app], [ng-controller]') ||
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

// Multi-page scanning for comprehensive analysis
export async function scanMultiplePages(baseUrl: string, options: ScanOptions = {}): Promise<ScanResult[]> {
  const { maxPages = 5, crawlDepth = 2 } = options
  
  const browser = await puppeteer.launch({ headless: 'new' })
  
  try {
    const page = await browser.newPage()
    await page.goto(baseUrl, { waitUntil: 'networkidle2' })
    
    // Discover links to scan
    const links = await page.evaluate((maxPages) => {
      const linkElements = Array.from(document.querySelectorAll('a[href]'))
      return linkElements
        .map(link => (link as HTMLAnchorElement).href)
        .filter(href => href.startsWith(window.location.origin))
        .slice(0, maxPages - 1) // -1 because we'll include the base URL
    }, maxPages)
    
    await browser.close()
    
    // Scan each discovered page
    const urls = [baseUrl, ...links].slice(0, maxPages)
    const results: ScanResult[] = []
    
    for (const url of urls) {
      try {
        const result = await scanWebsite(url, options)
        results.push(result)
      } catch (error) {
        console.error(`Failed to scan ${url}:`, error)
      }
    }
    
    return results
  } finally {
    await browser.close()
  }
}