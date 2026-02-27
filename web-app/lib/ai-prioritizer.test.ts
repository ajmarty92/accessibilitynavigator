import { describe, test } from 'node:test'
import assert from 'node:assert'
import { parseAIResponse } from './ai-prioritizer.ts'
import type { Violation } from './ai-prioritizer.ts'

describe('parseAIResponse', () => {
  const mockViolations: Violation[] = [
    {
      id: 'violation-1',
      description: 'Missing alt text',
      impact: 'serious',
      wcagReference: '1.1.1',
      elementCount: 1,
      nodes: [],
      category: 'accessibility'
    }
  ]

  test('Happy Path: parses valid JSON response correctly', () => {
    const validJson = JSON.stringify([
      {
        legalRiskScore: 8,
        userImpactScore: 9,
        businessRiskScore: 7,
        technicalComplexity: 4,
        priorityScore: 7.5,
        complianceLevel: 'Critical',
        deadlineRecommendation: 'Fix within 14 days',
        businessJustification: 'High legal risk',
        fixRecommendations: ['Add alt text'],
        estimatedEffort: '1 hour',
        businessValue: 'Reduced risk'
      }
    ])

    const result = parseAIResponse(validJson, mockViolations)

    assert.strictEqual(result.length, 1)
    assert.strictEqual(result[0].legalRiskScore, 8)
    assert.strictEqual(result[0].userImpactScore, 9)
    assert.strictEqual(result[0].complianceLevel, 'Critical')
    assert.ok(result[0].priorityScore > 0)
  })

  test('Resilience: extracts JSON from surrounding text', () => {
    const responseWithText = `
      Here is the analysis you requested:

      \`\`\`json
      [
        {
          "legalRiskScore": 5,
          "userImpactScore": 5,
          "businessRiskScore": 5,
          "technicalComplexity": 5,
          "complianceLevel": "Medium"
        }
      ]
      \`\`\`

      Hope this helps!
    `

    const result = parseAIResponse(responseWithText, mockViolations)

    assert.strictEqual(result.length, 1)
    assert.strictEqual(result[0].legalRiskScore, 5)
  })

  test('Edge Case: malformed JSON triggers fallback', () => {
    const malformedJson = '[{"legalRiskScore": 8, "userImpactScore": 9' // Missing closing bracket

    const result = parseAIResponse(malformedJson, mockViolations)

    assert.strictEqual(result.length, 1)
    // Fallback values should be used
    assert.strictEqual(result[0].complianceLevel, 'Medium')
    assert.strictEqual(result[0].deadlineRecommendation, 'Review within 30 days')
  })

  test('Edge Case: no JSON found triggers fallback', () => {
    const noJson = 'I could not analyze this violation.'

    const result = parseAIResponse(noJson, mockViolations)

    assert.strictEqual(result.length, 1)
    assert.strictEqual(result[0].complianceLevel, 'Medium')
  })

  test('Edge Case: empty JSON array', () => {
    const emptyJson = '[]'

    const result = parseAIResponse(emptyJson, mockViolations)

    assert.strictEqual(result.length, 0)
  })

  test('Schema Validation: defaults applied for missing fields', () => {
    const partialJson = JSON.stringify([
      {
        legalRiskScore: 8
        // Missing other fields
      }
    ])

    const result = parseAIResponse(partialJson, mockViolations)

    assert.strictEqual(result.length, 1)
    assert.strictEqual(result[0].legalRiskScore, 8)
    // Verify defaults
    assert.strictEqual(result[0].userImpactScore, 5) // Default
    assert.strictEqual(result[0].businessRiskScore, 5) // Default
    assert.strictEqual(result[0].complianceLevel, 'Medium') // Default
  })

  test('Schema Validation: scores clamped to 1-10 range', () => {
    const outOfRangeJson = JSON.stringify([
      {
        legalRiskScore: 15, // Too high
        userImpactScore: -5, // Too low
        businessRiskScore: 10,
        technicalComplexity: 1
      }
    ])

    const result = parseAIResponse(outOfRangeJson, mockViolations)

    assert.strictEqual(result.length, 1)
    assert.strictEqual(result[0].legalRiskScore, 10) // Clamped to max
    assert.strictEqual(result[0].userImpactScore, 1) // Clamped to min
  })

  test('Error Handling: exceptions trigger fallback', () => {
    // We can simulate an exception by passing invalid arguments or relying on JSON.parse behavior
    // The malformed JSON test effectively covers the JSON.parse exception
    // But we can also test if the extracted JSON is not an array

    const notAnArrayJson = '{"foo": "bar"}'

    const result = parseAIResponse(notAnArrayJson, mockViolations)

    // Should fallback because .map will fail on non-array
    assert.strictEqual(result.length, 1)
    assert.strictEqual(result[0].complianceLevel, 'Medium')
  })
})
