
export function mergeViolations(axeViolations: any[], customViolations: any[]): any[] {
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
    const aVal = impactOrder[a.impact as keyof typeof impactOrder]
    const bVal = impactOrder[b.impact as keyof typeof impactOrder]

    // Use nullish coalescing since 0 is a falsy value but valid (critical)
    const aImpact = aVal ?? 99
    const bImpact = bVal ?? 99

    return aImpact - bImpact
  })
}
