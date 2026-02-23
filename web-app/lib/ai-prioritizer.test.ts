import { test, describe } from 'node:test';
import assert from 'node:assert';
import { calculatePriorityScore } from './ai-prioritizer.ts';

describe('calculatePriorityScore', () => {
  test('should calculate correct score for standard values', () => {
    const analysis = {
      legalRiskScore: 8,
      userImpactScore: 9,
      businessRiskScore: 7,
      technicalComplexity: 4
    };
    // Weights: legal (0.35), user (0.35), business (0.20), technical (0.10 inverted)
    // Calculation:
    // legal: 8 * 0.35 = 2.8
    // user: 9 * 0.35 = 3.15
    // business: 7 * 0.20 = 1.4
    // technical: (10 - 4) * 0.10 = 0.6
    // Sum: 2.8 + 3.15 + 1.4 + 0.6 = 7.95
    // Rounded (Math.round(7.95 * 10) / 10): 80 / 10 = 8.0
    const score = calculatePriorityScore(analysis);
    assert.strictEqual(score, 8.0);
  });

  test('should use default value of 5 for missing fields', () => {
    const analysis = {};
    // All default to 5
    // legal: 5 * 0.35 = 1.75
    // user: 5 * 0.35 = 1.75
    // business: 5 * 0.20 = 1.0
    // technical: (10 - 5) * 0.10 = 0.5
    // Sum: 1.75 + 1.75 + 1.0 + 0.5 = 5.0
    const score = calculatePriorityScore(analysis);
    assert.strictEqual(score, 5.0);
  });

  test('should calculate correct score for minimum values (scores of 1)', () => {
    const analysis = {
      legalRiskScore: 1,
      userImpactScore: 1,
      businessRiskScore: 1,
      technicalComplexity: 1
    };
    // legal: 1 * 0.35 = 0.35
    // user: 1 * 0.35 = 0.35
    // business: 1 * 0.20 = 0.2
    // technical: (10 - 1) * 0.10 = 0.9
    // Sum: 0.35 + 0.35 + 0.2 + 0.9 = 1.8
    const score = calculatePriorityScore(analysis);
    assert.strictEqual(score, 1.8);
  });

  test('should calculate correct score for maximum risk and complexity (scores of 10)', () => {
    const analysis = {
      legalRiskScore: 10,
      userImpactScore: 10,
      businessRiskScore: 10,
      technicalComplexity: 10
    };
    // legal: 10 * 0.35 = 3.5
    // user: 10 * 0.35 = 3.5
    // business: 10 * 0.20 = 2.0
    // technical: (10 - 10) * 0.10 = 0.0
    // Sum: 3.5 + 3.5 + 2.0 + 0.0 = 9.0
    const score = calculatePriorityScore(analysis);
    assert.strictEqual(score, 9.0);
  });

  test('should achieve high priority when complexity is low (1)', () => {
    const analysis = {
      legalRiskScore: 10,
      userImpactScore: 10,
      businessRiskScore: 10,
      technicalComplexity: 1
    };
    // legal: 3.5, user: 3.5, business: 2.0
    // technical: (10 - 1) * 0.10 = 0.9
    // Sum: 3.5 + 3.5 + 2.0 + 0.9 = 9.9
    const score = calculatePriorityScore(analysis);
    assert.strictEqual(score, 9.9);
  });

  test('should round to one decimal place', () => {
    const analysis = {
      legalRiskScore: 8.2,
      userImpactScore: 9.1,
      businessRiskScore: 7.3,
      technicalComplexity: 4.5
    };
    // legal: 8.2 * 0.35 = 2.87
    // user: 9.1 * 0.35 = 3.185
    // business: 7.3 * 0.20 = 1.46
    // technical: (10 - 4.5) * 0.10 = 0.55
    // Sum: 2.87 + 3.185 + 1.46 + 0.55 = 8.065
    // Rounded (Math.round(8.065 * 10) / 10): 80.65 -> 81 -> 8.1
    const score = calculatePriorityScore(analysis);
    assert.strictEqual(score, 8.1);
  });

  test('should handle edge case where score is 0 correctly (should NOT default to 5)', () => {
    const analysis = {
      legalRiskScore: 0,
      userImpactScore: 0,
      businessRiskScore: 0,
      technicalComplexity: 0
    };
    // legal: 0, user: 0, business: 0, technical: (10-0)*0.1 = 1.0
    const score = calculatePriorityScore(analysis);
    assert.strictEqual(score, 1.0);
  });
});
