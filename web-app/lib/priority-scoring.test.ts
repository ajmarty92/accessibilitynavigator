import { describe, it } from 'node:test'
import assert from 'node:assert'
import { calculatePriorityScore } from './priority-scoring.ts'

describe('calculatePriorityScore', () => {
  it('should return default score of 5.0 when passed an empty object', () => {
    const analysis = {}
    const score = calculatePriorityScore(analysis)
    assert.strictEqual(score, 5.0)
  })

  it('should return 9.9 for maximum priority scenario (max risk/impact, min complexity)', () => {
    const analysis = {
      legalRiskScore: 10,
      userImpactScore: 10,
      businessRiskScore: 10,
      technicalComplexity: 1
    }
    // Calculation:
    // Legal: 10 * 0.35 = 3.5
    // User: 10 * 0.35 = 3.5
    // Business: 10 * 0.20 = 2.0
    // Tech: (10 - 1) * 0.10 = 0.9
    // Total: 3.5 + 3.5 + 2.0 + 0.9 = 9.9
    const score = calculatePriorityScore(analysis)
    assert.strictEqual(score, 9.9)
  })

  it('should return 0.9 for minimum priority scenario (min risk/impact, max complexity)', () => {
    const analysis = {
      legalRiskScore: 1,
      userImpactScore: 1,
      businessRiskScore: 1,
      technicalComplexity: 10
    }
    // Calculation:
    // Legal: 1 * 0.35 = 0.35
    // User: 1 * 0.35 = 0.35
    // Business: 1 * 0.20 = 0.20
    // Tech: (10 - 10) * 0.10 = 0
    // Total: 0.35 + 0.35 + 0.20 + 0 = 0.9
    const score = calculatePriorityScore(analysis)
    assert.strictEqual(score, 0.9)
  })

  it('should give higher priority to lower complexity (inversion test)', () => {
    const highComplexity = {
      legalRiskScore: 5,
      userImpactScore: 5,
      businessRiskScore: 5,
      technicalComplexity: 9 // High complexity -> Low priority contribution
    }
    const lowComplexity = {
      legalRiskScore: 5,
      userImpactScore: 5,
      businessRiskScore: 5,
      technicalComplexity: 1 // Low complexity -> High priority contribution
    }

    const lowScore = calculatePriorityScore(highComplexity)
    const highScore = calculatePriorityScore(lowComplexity)

    assert.ok(highScore > lowScore, 'Lower complexity should result in higher priority score')
  })

  it('should round the result to one decimal place', () => {
      // Create a scenario that would result in multiple decimal places
      // e.g.
      // Legal: 7 * 0.35 = 2.45
      // User: 8 * 0.35 = 2.80
      // Business: 6 * 0.20 = 1.20
      // Tech: (10-5) * 0.10 = 0.50
      // Total: 6.95 -> rounds to 7.0

      const analysis1 = {
        legalRiskScore: 7,
        userImpactScore: 8,
        businessRiskScore: 6,
        technicalComplexity: 5
      }

      const score1 = calculatePriorityScore(analysis1)
      assert.strictEqual(score1, 7.0)

      // Another case
      // Legal: 2 * 0.35 = 0.70
      // User: 3 * 0.35 = 1.05
      // Business: 2 * 0.20 = 0.40
      // Tech: (10-8) * 0.10 = 0.20
      // Total: 2.35 -> rounds to 2.4

      const analysis2 = {
        legalRiskScore: 2,
        userImpactScore: 3,
        businessRiskScore: 2,
        technicalComplexity: 8
      }
      const score2 = calculatePriorityScore(analysis2)
      assert.strictEqual(score2, 2.4)
  })
})
