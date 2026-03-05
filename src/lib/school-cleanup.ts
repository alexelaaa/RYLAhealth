/**
 * Normalizes a school name for display: title case, expand abbreviations, fix common issues
 */
export function normalizeSchoolName(name: string): string {
  let normalized = name.trim().replace(/\s+/g, " ");

  // Fix "Highschool" -> "High School" (one word to two)
  normalized = normalized.replace(/highschool/gi, "High School");

  // Fix "ASchool" -> "School" (stray A before School)
  normalized = normalized.replace(/\bASchool\b/gi, "School");

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

  // Remove duplicate "High School High School"
  normalized = normalized.replace(/(High School)\s+\1/gi, "High School");

  // Title case
  normalized = normalized
    .split(" ")
    .map((word, i) => {
      const small = ["of", "the", "and", "at", "in", "for", "on"];
      if (i > 0 && small.includes(word.toLowerCase())) {
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
 * Creates a fuzzy key for grouping school name variants together.
 * Strips suffixes like "High School", normalizes spacing/case, and fixes typos.
 */
function fuzzyKey(name: string): string {
  let key = name.toLowerCase().trim().replace(/\s+/g, " ");

  // Fix "highschool" -> "high school"
  key = key.replace(/highschool/g, "high school");

  // Fix "aschool" -> "school"
  key = key.replace(/aschool/g, "school");

  // Remove common suffixes to group base names together
  key = key
    .replace(/\s*(high school|high|middle school|charter school|academy|school|continuation)\s*$/g, "")
    .trim();

  // Remove common prefixes that don't help
  key = key.replace(/^the\s+/g, "");

  // Normalize common typos by removing doubled consonants and vowels for comparison
  // e.g., "hots" vs "hot" — use a simple Levenshtein-like approach below instead

  // Remove all non-alphanumeric for the key
  key = key.replace(/[^a-z0-9]/g, "");

  return key;
}

/**
 * Simple Levenshtein distance
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

/**
 * Groups school name variants that normalize to the same canonical name.
 * Uses fuzzy matching to catch typos and suffix variations.
 */
export function groupSchoolVariants(
  schools: { name: string; count: number }[]
): { canonical: string; variants: { name: string; count: number }[] }[] {
  // First pass: group by fuzzy key
  const keyGroups = new Map<string, { name: string; count: number }[]>();

  for (const school of schools) {
    const key = fuzzyKey(school.name);
    if (!keyGroups.has(key)) {
      keyGroups.set(key, []);
    }
    keyGroups.get(key)!.push(school);
  }

  // Second pass: merge groups whose fuzzy keys are within edit distance 2
  const keys = Array.from(keyGroups.keys());
  const merged = new Map<string, { name: string; count: number }[]>();
  const consumed = new Set<string>();

  for (let i = 0; i < keys.length; i++) {
    if (consumed.has(keys[i])) continue;

    const group = [...keyGroups.get(keys[i])!];
    consumed.add(keys[i]);

    for (let j = i + 1; j < keys.length; j++) {
      if (consumed.has(keys[j])) continue;

      // Only merge if keys are short enough that edit distance 2 is meaningful
      const maxLen = Math.max(keys[i].length, keys[j].length);
      const threshold = maxLen <= 5 ? 1 : 2;

      if (levenshtein(keys[i], keys[j]) <= threshold) {
        group.push(...keyGroups.get(keys[j])!);
        consumed.add(keys[j]);
      }
    }

    // Pick canonical name: normalize the most common variant
    group.sort((a, b) => b.count - a.count);
    const canonical = normalizeSchoolName(group[0].name);
    merged.set(canonical, group);
  }

  return Array.from(merged.entries())
    .map(([canonical, variants]) => ({
      canonical,
      variants: variants.sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => a.canonical.localeCompare(b.canonical));
}
