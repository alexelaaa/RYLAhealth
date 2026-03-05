/**
 * Normalize a DGL cabin name so it can be prefix-matched against student cabins.
 * e.g. "Cabin 16C" → "Cabin 16 C", "Cabin 18A" → "Cabin 18 A"
 */
export function normalizeCabinPrefix(dglCabin: string): string {
  return dglCabin.replace(/(\d)([A-Za-z])$/, "$1 $2");
}

/**
 * Check if a camper's cabin matches a DGL's cabin.
 * Handles exact match, normalized match, and sub-cabin (e.g. "Cabin 16 A1").
 */
export function camperMatchesCabin(camperCabin: string, dglCabin: string): boolean {
  const normalizedPrefix = normalizeCabinPrefix(dglCabin);
  if (camperCabin === dglCabin || camperCabin === normalizedPrefix) return true;
  // Sub-cabin match: "Cabin 16 A" matches "Cabin 16 A1", "Cabin 16 A2"
  if (camperCabin.startsWith(normalizedPrefix) && camperCabin.length === normalizedPrefix.length + 1) {
    const suffix = camperCabin[camperCabin.length - 1];
    return suffix >= "0" && suffix <= "9";
  }
  return false;
}
