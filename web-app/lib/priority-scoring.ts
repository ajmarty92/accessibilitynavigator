export function calculatePriorityScore(analysis: any): number {
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
