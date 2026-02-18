import type { Camper } from "@/types";

/**
 * Returns true if the value contains real medical info (not "none", "n/a", etc.)
 */
export function isNonEmpty(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed === "") return false;

  const normalized = trimmed.toLowerCase();

  // Exact matches
  const blanks = [
    "none",
    "n/a",
    "na",
    "no",
    "nope",
    "nil",
    "-",
    "--",
    ".",
    "none.",
    "no.",
  ];
  if (blanks.includes(normalized)) return false;

  // Pattern matches for common "nothing" phrases
  const patterns = [
    /^no\s+(known\s+)?(allergies|medications?|conditions?|dietary|restrictions?|medical)/i,
    /^none\s+(at this time|known|that i know|reported|listed|applicable)/i,
    /^not\s+(applicable|any|that i know)/i,
    /^i\s+don'?t\s+have\s+any/i,
    /^does\s+not\s+have\s+any/i,
    /^doesn'?t\s+have\s+any/i,
    /^no\s+dietary\s+restrictions?/i,
    /^nothing/i,
    /^n\/a/i,
  ];

  return !patterns.some((p) => p.test(trimmed));
}

/**
 * Detects if medication text mentions timed schedules
 */
export function hasTimedMedication(text: string | null | undefined): boolean {
  if (!text || !isNonEmpty(text)) return false;

  const patterns = [
    /\b(morning|evening|night|bedtime|noon)\b/i,
    /\b(daily|twice|once)\b/i,
    /\b(every\s+\d+\s+hours?)\b/i,
    /\b(before|after|with)\s+(meals?|breakfast|lunch|dinner|food)\b/i,
    /\b\d{1,2}(:\d{2})?\s*(am|pm)\b/i,
    /\b(am|pm)\b/i,
    /\b(a\.m\.|p\.m\.)\b/i,
  ];

  return patterns.some((p) => p.test(text));
}

/**
 * Detects if allergy text mentions EpiPen / epinephrine / anaphylaxis
 */
export function hasEpiPen(text: string | null | undefined): boolean {
  if (!text) return false;
  return /epi[\s-]?pen|epinephrine|anaphyla/i.test(text);
}

export interface MedicalAlertCamper {
  id: number;
  firstName: string;
  lastName: string;
  campWeekend: string;
  value: string;
  hasEpiPen?: boolean;
  hasTimed?: boolean;
  isManualOverride?: boolean;
  medicationSchedule?: string[];
}

/**
 * Extract flagged campers from a list for a given field
 */
export function extractAlerts(
  camperList: Camper[],
  field: keyof Camper
): MedicalAlertCamper[] {
  return camperList
    .filter((c) => isNonEmpty(c[field] as string))
    .map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      campWeekend: c.campWeekend,
      value: (c[field] as string).trim(),
    }));
}
