import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface Violation {
  id: string
  description: string
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  wcagReference: string
  elementCount?: number
  nodes?: any[]
  category?: string
  helpUrl?: string
}

export interface SiteContext {
  industry?: string
  monthlyVisitors?: number
  regions?: string[]
  revenueModel?: string
  previousViolations?: number
  targetAudience?: string[]
}

export interface AIAnalysis {
  legalRiskScore: number      // 1-10 (lawsuit likelihood based on recent cases)
  userImpactScore: number     // 1-10 (severity for disabled users)
  businessRiskScore: number   // 1-10 (revenue/reputation impact)
  technicalComplexity: number // 1-10 (implementation difficulty)
  priorityScore: number       // Weighted calculation
  complianceLevel: 'Critical' | 'High' | 'Medium' | 'Low'
  deadlineRecommendation: string
  businessJustification: string
  fixRecommendations: string[]
  estimatedEffort: string
  businessValue: string
}

export async function analyzeViolationsWithAI(
  violations: Violation[],
  siteContext: SiteContext = {}
): Promise<AIAnalysis[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    // Fallback to basic scoring if no API key
    return violations.map(violation => ({
      legalRiskScore: getBasicLegalRiskScore(violation),
      userImpactScore: getBasicUserImpactScore(violation),
      businessRiskScore: getBasicBusinessRiskScore(violation),
      technicalComplexity: getBasicTechnicalComplexity(violation),
      priorityScore: 0,
      complianceLevel: 'Medium' as const,
      deadlineRecommendation: 'Review within 30 days',
      businessJustification: 'Standard accessibility compliance required',
      fixRecommendations: ['Implement standard accessibility fix'],
      estimatedEffort: '2-4 hours',
      businessValue: 'Improved user experience'
    }))
  }

  const prompt = buildEnhancedPrompt(violations, siteContext)

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022', // Upgraded to latest model
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const content = response.content[0]
    if (content.type === 'text') {
      return parseAIResponse(content.text, violations)
    }

    throw new Error('Unexpected response format from Claude')
  } catch (error) {
    console.error('AI analysis failed:', error)
    // Fallback to basic scoring
    return violations.map(violation => ({
      legalRiskScore: getBasicLegalRiskScore(violation),
      userImpactScore: getBasicUserImpactScore(violation),
      businessRiskScore: getBasicBusinessRiskScore(violation),
      technicalComplexity: getBasicTechnicalComplexity(violation),
      priorityScore: 0,
      complianceLevel: 'Medium' as const,
      deadlineRecommendation: 'Review within 30 days',
      businessJustification: 'Accessibility compliance required',
      fixRecommendations: ['Review and implement fix'],
      estimatedEffort: '2-4 hours',
      businessValue: 'Improved accessibility'
    }))
  }
}

function buildEnhancedPrompt(violations: Violation[], siteContext: SiteContext): string {
  return `You are an accessibility compliance expert with deep knowledge of:
- Recent accessibility lawsuits and enforcement trends (2024-2025)
- Industry-specific compliance requirements (ADA, Section 508, EN 301549)
- WCAG 2.2 Level AA guidelines and implementation best practices
- Modern web frameworks and accessibility patterns
- Business impact and legal risk assessment

SITE CONTEXT:
- Industry: ${siteContext.industry || 'general'}
- Monthly Visitors: ${siteContext.monthlyVisitors || 'unknown'}
- Target Regions: ${siteContext.regions?.join(', ') || 'global'}
- Revenue Model: ${siteContext.revenueModel || 'unknown'}
- Target Audience: ${siteContext.targetAudience?.join(', ') || 'general'}
- Compliance History: ${siteContext.previousViolations || 0} previous violations

VIOLATIONS TO ANALYZE:
${violations.map((v, i) => `
${i + 1}. ${v.description}
   - WCAG Reference: ${v.wcagReference}
   - Impact Level: ${v.impact}
   - Elements Affected: ${v.elementCount || 0}
   - Category: ${v.category || 'general'}
`).join('\n')}

For each violation, provide detailed analysis considering:

1. LEGAL RISK SCORE (1-10):
   - Recent lawsuit trends in this industry/region
   - Regulatory enforcement patterns
   - Compliance deadline pressures
   - Historical settlement amounts

2. USER IMPACT SCORE (1-10):
   - Severity for specific disabilities
   - Number of users affected
   - Critical functionality barriers
   - Alternative access availability

3. BUSINESS RISK SCORE (1-10):
   - Revenue impact and conversion optimization
   - Brand reputation and PR considerations
   - SEO and search ranking implications
   - Competitive compliance landscape

4. TECHNICAL COMPLEXITY (1-10):
   - Implementation difficulty and time required
   - Framework-specific challenges
   - Testing and validation requirements
   - Potential for breaking changes

5. PRIORITY SCORE (weighted calculation):
   - Legal Risk: 35%
   - User Impact: 35%
   - Business Risk: 20%
   - Technical Complexity: 10% (inverted - lower complexity = higher priority)

6. COMPLIANCE LEVEL:
   - Critical: Immediate legal action likely
   - High: Significant legal/compliance risk
   - Medium: Standard compliance requirement
   - Low: Minor improvement opportunity

7. BUSINESS-CENTRIC RECOMMENDATIONS:
   - Deadline recommendations with business justification
   - Revenue impact analysis
   - Competitive advantage opportunities
   - Framework-specific code fix strategies
   - Implementation effort estimates
   - ROI and business value assessment

RESPONSE FORMAT:
Respond as a JSON array with detailed analysis for each violation:

[
  {
    "legalRiskScore": 8,
    "userImpactScore": 9,
    "businessRiskScore": 7,
    "technicalComplexity": 4,
    "priorityScore": 7.5,
    "complianceLevel": "Critical",
    "deadlineRecommendation": "Fix within 14 days - high lawsuit risk in finance sector",
    "businessJustification": "Recent ADA lawsuits in banking have averaged $250K settlements",
    "fixRecommendations": ["Implement ARIA labels", "Add keyboard navigation", "Update color contrast"],
    "estimatedEffort": "4-8 hours for React implementation",
    "businessValue": "Reduces legal risk by 80%, improves conversion for visually impaired users"
  }
]

Prioritize business impact and practical implementation guidance for development teams.`
}

function parseAIResponse(responseText: string, violations: Violation[]): AIAnalysis[] {
  try {
    // Extract JSON from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('No JSON array found in response')
    }

    const analyses = JSON.parse(jsonMatch[0])
    
    // Calculate priority scores and ensure all required fields
    return analyses.map((analysis: any, index: number) => {
      const priorityScore = calculatePriorityScore(analysis)
      
      return {
        legalRiskScore: Math.max(1, Math.min(10, analysis.legalRiskScore || 5)),
        userImpactScore: Math.max(1, Math.min(10, analysis.userImpactScore || 5)),
        businessRiskScore: Math.max(1, Math.min(10, analysis.businessRiskScore || 5)),
        technicalComplexity: Math.max(1, Math.min(10, analysis.technicalComplexity || 5)),
        priorityScore,
        complianceLevel: analysis.complianceLevel || 'Medium',
        deadlineRecommendation: analysis.deadlineRecommendation || 'Review within 30 days',
        businessJustification: analysis.businessJustification || 'Standard accessibility compliance required',
        fixRecommendations: Array.isArray(analysis.fixRecommendations) ? analysis.fixRecommendations : ['Implement fix'],
        estimatedEffort: analysis.estimatedEffort || '2-4 hours',
        businessValue: analysis.businessValue || 'Improved accessibility and user experience'
      }
    })
  } catch (error) {
    console.error('Failed to parse AI response:', error)
    // Return basic analyses for all violations
    return violations.map(() => createFallbackAnalysis())
  }
}

function calculatePriorityScore(analysis: any): number {
  const weights = {
    legalRisk: 0.35,
    userImpact: 0.35,
    businessRisk: 0.20,
    technicalComplexity: 0.10
  }

  const score = 
    (analysis.legalRiskScore || 5) * weights.legalRisk +
    (analysis.userImpactScore || 5) * weights.userImpact +
    (analysis.businessRiskScore || 5) * weights.businessRisk +
    (10 - (analysis.technicalComplexity || 5)) * weights.technicalComplexity

  return Math.round(score * 10) / 10
}

function createFallbackAnalysis(): AIAnalysis {
  return {
    legalRiskScore: 5,
    userImpactScore: 5,
    businessRiskScore: 5,
    technicalComplexity: 5,
    priorityScore: 5.0,
    complianceLevel: 'Medium',
    deadlineRecommendation: 'Review within 30 days',
    businessJustification: 'Accessibility compliance required',
    fixRecommendations: ['Review and implement fix'],
    estimatedEffort: '2-4 hours',
    businessValue: 'Improved accessibility'
  }
}

// Fallback scoring functions for when AI is unavailable
function getBasicLegalRiskScore(violation: Violation): number {
  const criticalKeywords = ['keyboard', 'focus', 'aria', 'label', 'title']
  const hasCriticalIssue = criticalKeywords.some(keyword => 
    violation.description.toLowerCase().includes(keyword)
  )
  
  switch (violation.impact) {
    case 'critical': return hasCriticalIssue ? 9 : 8
    case 'serious': return hasCriticalIssue ? 7 : 6
    case 'moderate': return 4
    case 'minor': return 2
    default: return 5
  }
}

function getBasicUserImpactScore(violation: Violation): number {
  switch (violation.impact) {
    case 'critical': return 9
    case 'serious': return 7
    case 'moderate': return 5
    case 'minor': return 3
    default: return 5
  }
}

function getBasicBusinessRiskScore(violation: Violation): number {
  switch (violation.impact) {
    case 'critical': return 8
    case 'serious': return 6
    case 'moderate': return 4
    case 'minor': return 2
    default: return 5
  }
}

function getBasicTechnicalComplexity(violation: Violation): number {
  // Base complexity on the category and description
  const complexKeywords = ['dynamic', 'javascript', 'react', 'framework', 'custom']
  const isComplex = complexKeywords.some(keyword => 
    violation.description.toLowerCase().includes(keyword)
  )
  
  return isComplex ? 7 : 4
}