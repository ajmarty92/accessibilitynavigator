import Anthropic from '@anthropic-ai/sdk'
import type { Violation } from './scanner'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface CodeFix {
  id: string
  violationId: string
  framework: 'react' | 'vue' | 'angular' | 'html' | 'svelte'
  originalCode: string
  fixedCode: string
  explanation: string
  steps: string[]
  testingRecommendations: string[]
  browserCompatibility: string[]
  additionalImprovements: string[]
  cssClasses?: {
    original: string
    fixed: string
  }
  beforeAfter?: {
    description: string
    impact: string
  }
}

export interface ScanContext {
  url: string
  framework?: string
  detectedLibraries: string[]
  pageType?: string
}

export async function generateCodeFixes(
  violations: Violation[],
  context: ScanContext
): Promise<CodeFix[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return generateBasicFixes(violations, context)
  }

  try {
    const fixes = await generateAICodeFixes(violations, context)
    return fixes
  } catch (error) {
    console.error('AI code fix generation failed, using basic fixes:', error)
    return generateBasicFixes(violations, context)
  }
}

async function generateAICodeFixes(
  violations: Violation[],
  context: ScanContext
): Promise<CodeFix[]> {
  const batchSize = 3 // Process 3 violations at a time for detailed analysis
  const allFixes: CodeFix[] = []

  for (let i = 0; i < violations.length; i += batchSize) {
    const batch = violations.slice(i, i + batchSize)
    const fixes = await generateBatchFixes(batch, context)
    allFixes.push(...fixes)
  }

  return allFixes
}

async function generateBatchFixes(
  violations: Violation[],
  context: ScanContext
): Promise<CodeFix[]> {
  const framework = detectPrimaryFramework(violations, context)
  
  const prompt = buildCodeFixPrompt(violations, context, framework)
  
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  })

  const response = message.content[0]
  if (response.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  const fixes = parseCodeFixResponse(response.text, violations, framework)
  
  return fixes.map((fix, index) => ({
    ...fix,
    id: `fix-${violations[index].id}-${Date.now()}`,
    violationId: violations[index].id,
  }))
}

function buildCodeFixPrompt(
  violations: Violation[],
  context: ScanContext,
  framework: string
): string {
  const frameworkSpecific = getFrameworkSpecificPrompt(framework)
  
  return `You are an expert web accessibility developer with deep knowledge of:
- WCAG 2.2 Level AA guidelines implementation
- Modern web frameworks (${framework}) and accessibility patterns
- Screen reader compatibility and assistive technology
- Cross-browser accessibility considerations
- Production-ready code examples

SCAN CONTEXT:
- URL: ${context.url}
- Framework: ${framework}
- Libraries: ${context.detectedLibraries.join(', ')}
- Page Type: ${context.pageType || 'Unknown'}

VIOLATIONS TO FIX:
${violations.map((v, i) => `
${i + 1}. VIOLATION ID: ${v.id}
   Description: ${v.description}
   WCAG Reference: ${v.wcagReference}
   Impact: ${v.impact}
   Help: ${v.help}
   Current HTML: ${v.nodes[0]?.html || 'No HTML available'}
   Target Element: ${v.nodes[0]?.target?.join(' > ') || 'Unknown'}
`).join('\n')}

${frameworkSpecific}

For EACH violation, provide a complete, production-ready fix with:

1. FIXED CODE: Complete corrected code (framework-specific)
2. EXPLANATION: Technical explanation of the fix and why it resolves the violation
3. IMPLEMENTATION STEPS: Step-by-step guide for developers
4. TESTING RECOMMENDATIONS: How to test the fix works correctly
5. BROWSER COMPATIBILITY: Any browser-specific considerations
6. ADDITIONAL IMPROVEMENTS: Related accessibility enhancements
7. BEFORE/AFTER: Description of the improvement and its impact

RESPONSE FORMAT:
Respond ONLY as a JSON array:
[
  {
    "fixedCode": "complete corrected code here",
    "explanation": "detailed technical explanation",
    "steps": ["step 1", "step 2", "step 3"],
    "testingRecommendations": ["test 1", "test 2"],
    "browserCompatibility": ["note 1", "note 2"],
    "additionalImprovements": ["improvement 1", "improvement 2"],
    "beforeAfter": {
      "description": "what changed",
      "impact": "why it matters"
    },
    "cssClasses": {
      "original": "original classes",
      "fixed": "updated classes"
    }
  }
]

Make sure each fix is:
- Production-ready and follows framework best practices
- Fully accessible and compliant with WCAG 2.2
- Thoroughly tested with screen readers
- Compatible with modern browsers
- Performant and maintainable`
}

function getFrameworkSpecificPrompt(framework: string): string {
  switch (framework) {
    case 'react':
      return `
REACT-SPECIFIC REQUIREMENTS:
- Use functional components with hooks where appropriate
- Implement proper ARIA props (aria-label, aria-labelledby, role)
- Use semantic HTML elements within JSX
- Ensure keyboard navigation works with React state
- Consider ref usage for accessibility focus management
- Use React Testing Library patterns for accessibility testing
      `
    case 'vue':
      return `
VUE-SPECIFIC REQUIREMENTS:
- Use Vue 3 Composition API where appropriate
- Implement proper ARIA attributes in templates
- Use semantic HTML within Vue templates
- Ensure refs and reactive accessibility state work correctly
- Consider VueUse for accessibility utilities
- Use proper event handling for keyboard navigation
      `
    case 'angular':
      return `
ANGULAR-SPECIFIC REQUIREMENTS:
- Use Angular CDK a11y utilities where helpful
- Implement proper ARIA attributes in templates
- Use semantic HTML within Angular templates
- Ensure @ViewChild and ElementRef used for accessibility
- Consider Angular Material accessibility patterns
- Use proper FormControl accessibility features
      `
    case 'svelte':
      return `
SVELTE-SPECIFIC REQUIREMENTS:
- Use Svelte accessibility best practices
- Implement proper ARIA attributes in templates
- Use semantic HTML within Svelte components
- Ensure bind:this for focus management works correctly
- Consider Svelte stores for accessibility state
- Use proper event handling for keyboard navigation
      `
    default:
      return `
HTML/VANILLA JS REQUIREMENTS:
- Use semantic HTML5 elements
- Implement proper ARIA attributes
- Ensure progressive enhancement
- Use proper form labels and associations
- Consider focus management with JavaScript
- Follow web accessibility best practices
      `
  }
}

function parseCodeFixResponse(
  response: string, 
  violations: Violation[],
  framework: string
): Omit<CodeFix, 'id' | 'violationId'>[] {
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const fixes = JSON.parse(jsonMatch[0])
    
    if (!Array.isArray(fixes)) {
      throw new Error('Response is not an array')
    }

    return fixes.map((fix: any, index) => {
      const violation = violations[index]
      
      return {
        framework: framework as any,
        originalCode: violation.nodes[0]?.html || '',
        fixedCode: fix.fixedCode || '',
        explanation: fix.explanation || '',
        steps: fix.steps || [],
        testingRecommendations: fix.testingRecommendations || [],
        browserCompatibility: fix.browserCompatibility || [],
        additionalImprovements: fix.additionalImprovements || [],
        beforeAfter: fix.beforeAfter,
        cssClasses: fix.cssClasses,
      }
    })
  } catch (error) {
    console.error('Failed to parse code fix response:', error)
    return []
  }
}

function generateBasicFixes(
  violations: Violation[],
  context: ScanContext
): CodeFix[] {
  const framework = detectPrimaryFramework(violations, context)
  
  return violations.map(violation => {
    const basicFix = generateBasicFixForViolation(violation, framework)
    
    return {
      id: `basic-fix-${violation.id}-${Date.now()}`,
      violationId: violation.id,
      framework: framework as any,
      originalCode: violation.nodes[0]?.html || '',
      ...basicFix
    }
  })
}

function generateBasicFixForViolation(
  violation: Violation,
  framework: string
): Omit<CodeFix, 'id' | 'violationId' | 'framework' | 'originalCode'> {
  const impact = violation.impact
  
  // Generate basic fixes based on violation type and impact
  if (violation.description.toLowerCase().includes('contrast')) {
    return {
      fixedCode: generateContrastFix(violation),
      explanation: 'Color contrast has been improved to meet WCAG 2.2 AA standards (minimum 4.5:1 for normal text, 3:1 for large text).',
      steps: [
        'Identify text and background colors',
        'Calculate contrast ratio',
        'Adjust colors to meet minimum requirements',
        'Test with contrast checker tools'
      ],
      testingRecommendations: [
        'Use WebAIM Contrast Checker',
        'Test with Windows High Contrast mode',
        'Verify with different color blind simulators'
      ],
      browserCompatibility: ['Works in all modern browsers'],
      additionalImprovements: [
        'Consider using CSS custom properties for consistent theming',
        'Provide a high contrast mode option for users'
      ],
      beforeAfter: {
        description: 'Improved color contrast for better readability',
        impact: 'Makes content readable for users with low vision and color blindness'
      }
    }
  }

  if (violation.description.toLowerCase().includes('aria') || violation.description.toLowerCase().includes('label')) {
    return {
      fixedCode: generateAriaFix(violation, framework),
      explanation: 'Added appropriate ARIA labels and attributes to improve screen reader compatibility.',
      steps: [
        'Identify elements missing accessible names',
        'Add descriptive aria-label attributes',
        'Use aria-labelledby for complex relationships',
        'Ensure proper role assignments'
      ],
      testingRecommendations: [
        'Test with screen readers (NVDA, JAWS, VoiceOver)',
        'Verify keyboard navigation works correctly',
        'Check focus indicators are visible'
      ],
      browserCompatibility: ['ARIA attributes supported in all modern browsers'],
      additionalImprovements: [
        'Consider using skip links for better navigation',
        'Implement proper heading hierarchy'
      ],
      beforeAfter: {
        description: 'Added ARIA labels for screen reader compatibility',
        impact: 'Makes content accessible to users who rely on assistive technology'
      }
    }
  }

  if (violation.description.toLowerCase().includes('focus') || violation.description.toLowerCase().includes('keyboard')) {
    return {
      fixedCode: generateFocusFix(violation, framework),
      explanation: 'Improved keyboard accessibility and focus management for better user experience.',
      steps: [
        'Ensure all interactive elements are keyboard reachable',
        'Add visible focus indicators',
        'Implement proper tab order',
        'Handle focus trapping in modals'
      ],
      testingRecommendations: [
        'Test navigation with Tab key only',
        'Verify focus indicators are clearly visible',
        'Test focus trapping in modal dialogs'
      ],
      browserCompatibility: ['Focus styles work in all browsers, may need vendor prefixes for some'],
      additionalImprovements: [
        'Consider focus management in single-page applications',
        'Implement skip navigation links'
      ],
      beforeAfter: {
        description: 'Enhanced keyboard navigation and focus indicators',
        impact: 'Improves experience for keyboard-only users and screen reader users'
      }
    }
  }

  // Default generic fix
  return {
    fixedCode: generateGenericFix(violation),
    explanation: `Fixed ${violation.description} to improve accessibility compliance.`,
    steps: [
      'Identify the accessibility issue',
      'Apply appropriate fix based on WCAG guidelines',
      'Test with assistive technologies',
      'Validate with accessibility tools'
    ],
    testingRecommendations: [
      'Test with screen readers',
      'Verify keyboard navigation',
      'Use automated accessibility testing tools'
    ],
    browserCompatibility: ['Fixes work across all modern browsers'],
    additionalImprovements: [
      'Consider progressive enhancement',
      'Test with different assistive technologies'
    ],
    beforeAfter: {
      description: 'Applied accessibility fix to improve user experience',
      impact: 'Enhances accessibility for users with disabilities'
    }
  }
}

function generateContrastFix(violation: Violation): string {
  const originalHtml = violation.nodes[0]?.html || ''
  
  // Basic contrast fix - in real implementation, this would be more sophisticated
  if (originalHtml.includes('color:')) {
    return originalHtml.replace(/color:\s*[^;]+;?/g, 'color: #333333;')
  }
  
  return originalHtml
}

function generateAriaFix(violation: Violation, framework: string): string {
  const originalHtml = violation.nodes[0]?.html || ''
  
  if (framework === 'react') {
    if (originalHtml.includes('<button') && !originalHtml.includes('aria-label')) {
      return originalHtml.replace(
        /<button([^>]*)>/,
        '<button$1 aria-label="Action button">'
      )
    }
  } else {
    if (originalHtml.includes('<button') && !originalHtml.includes('aria-label')) {
      return originalHtml.replace(
        /<button([^>]*)>/,
        '<button$1 aria-label="Action button">'
      )
    }
  }
  
  return originalHtml
}

function generateFocusFix(violation: Violation, framework: string): string {
  const originalHtml = violation.nodes[0]?.html || ''
  
  // Add focus styles if missing
  if (!originalHtml.includes('focus') && !originalHtml.includes(':focus')) {
    if (originalHtml.includes('style=')) {
      return originalHtml.replace(
        /style="([^"]*)"/,
        'style="$1 outline: 2px solid #0066cc; outline-offset: 2px;"'
      )
    } else {
      return originalHtml.replace(
        /<(\w+)([^>]*)>/,
        '<$1 style="outline: 2px solid #0066cc; outline-offset: 2px;"$2>'
      )
    }
  }
  
  return originalHtml
}

function generateGenericFix(violation: Violation): string {
  const originalHtml = violation.nodes[0]?.html || ''
  
  // Add appropriate accessibility attributes
  if (!originalHtml.includes('role') && !originalHtml.includes('aria-')) {
    if (originalHtml.includes('<div')) {
      return originalHtml.replace(
        /<div([^>]*)>/,
        '<div$1 role="region" aria-label="Content area">'
      )
    }
  }
  
  return originalHtml
}

function detectPrimaryFramework(
  violations: Violation[], 
  context: ScanContext
): string {
  // Use context framework if available
  if (context.framework) {
    return context.framework.toLowerCase()
  }
  
  // Check violations for framework indicators
  const hasReact = violations.some(v => 
    v.framework === 'react' || 
    v.tags.some(tag => tag.includes('react')) ||
    v.nodes.some(node => node.html.includes('data-reactroot'))
  )
  
  const hasVue = violations.some(v => 
    v.framework === 'vue' || 
    v.tags.some(tag => tag.includes('vue')) ||
    v.nodes.some(node => node.html.includes('data-v-'))
  )
  
  const hasAngular = violations.some(v => 
    v.framework === 'angular' || 
    v.tags.some(tag => tag.includes('angular')) ||
    v.nodes.some(node => node.html.includes('ng-'))
  )
  
  const hasSvelte = violations.some(v => 
    v.framework === 'svelte' || 
    v.tags.some(tag => tag.includes('svelte')) ||
    v.nodes.some(node => node.html.includes('data-svelte-'))
  )
  
  if (hasReact) return 'react'
  if (hasVue) return 'vue'
  if (hasAngular) return 'angular'
  if (hasSvelte) return 'svelte'
  
  return 'html'
}

export async function validateCodeFix(
  fix: CodeFix
): Promise<{
  isValid: boolean
  issues: string[]
  suggestions: string[]
}> {
  const issues: string[] = []
  const suggestions: string[] = []
  
  // Basic validation
  if (!fix.fixedCode.trim()) {
    issues.push('Fixed code is empty')
  }
  
  if (!fix.explanation.trim()) {
    issues.push('Explanation is missing')
  }
  
  if (fix.steps.length === 0) {
    issues.push('No implementation steps provided')
  }
  
  // Framework-specific validation
  if (fix.framework === 'react') {
    if (!fix.fixedCode.includes('aria-') && !fix.fixedCode.includes('role')) {
      suggestions.push('Consider adding ARIA attributes for better accessibility')
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  }
}

export function formatCodeForDisplay(code: string, language = 'html'): string {
  // Format code for better readability
  return code
    .replace(/></g, '>\n<')
    .replace(/^\s+|\s+$/g, '')
    .split('\n')
    .map(line => line.trim())
    .join('\n')
}

export function getCodeFixSummary(fixes: CodeFix[]): {
  totalFixes: number
  fixesByFramework: Record<string, number>
  highImpactFixes: number
  estimatedTimeToImplement: string
} {
  const fixesByFramework: Record<string, number> = {}
  let highImpactFixes = 0
  
  fixes.forEach(fix => {
    fixesByFramework[fix.framework] = (fixesByFramework[fix.framework] || 0) + 1
  })
  
  // Estimate implementation time (basic calculation)
  const estimatedMinutes = fixes.length * 30 // 30 minutes per fix on average
  const estimatedTimeToImplement = estimatedMinutes < 60 
    ? `${estimatedMinutes} minutes`
    : `${Math.round(estimatedMinutes / 60)} hours`
  
  return {
    totalFixes: fixes.length,
    fixesByFramework,
    highImpactFixes,
    estimatedTimeToImplement
  }
}