/**
 * Normalizes a school name: title case, expand abbreviations, trim whitespace
 */
export function normalizeSchoolName(name: string): string {
  let normalized = name.trim().replace(/\s+/g, " ");

  // Expand common abbreviations (case-insensitive)
  const abbreviations: [RegExp, string][] = [
    [/\bHS\b/gi, "High School"],
    [/\bMS\b/gi, "Middle School"],
    [/\bElem\.?\b/gi, "Elementary"],
    [/\bSr\.?\b/gi, "Senior"],
    [/\bJr\.?\b/gi, "Junior"],
    [/\bSt\.?\b/gi, "Saint"],
    [/\bMt\.?\b/gi, "Mount"],
    [/\bAcad\.?\b/gi, "Academy"],
    [/\bPrep\.?\b/gi, "Preparatory"],
    [/\bInt\.?\b/gi, "Intermediate"],
    [/\bTech\.?\b/gi, "Technical"],
  ];

  for (const [pattern, replacement] of abbreviations) {
    normalized = normalized.replace(pattern, replacement);
  }

  // Title case
  normalized = normalized
    .split(" ")
    .map((word) => {
      // Keep small words lowercase unless first word
      const small = ["of", "the", "and", "at", "in", "for", "on"];
      if (small.includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");

  // Ensure first letter is uppercase
  if (normalized.length > 0) {
    normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  return normalized;
}

/**
 * Groups school name variants that normalize to the same canonical name.
 */
export function groupSchoolVariants(
  schools: { name: string; count: number }[]
): { canonical: string; variants: { name: string; count: number }[] }[] {
  const groups = new Map<string, { name: string; count: number }[]>();

  for (const school of schools) {
    const canonical = normalizeSchoolName(school.name);
    if (!groups.has(canonical)) {
      groups.set(canonical, []);
    }
    groups.get(canonical)!.push(school);
  }

  return Array.from(groups.entries())
    .map(([canonical, variants]) => ({
      canonical,
      variants: variants.sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => a.canonical.localeCompare(b.canonical));
}
