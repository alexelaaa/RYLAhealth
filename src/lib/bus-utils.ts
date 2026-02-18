/**
 * Helpers for detecting bus rider sessions and extracting bus number.
 */

const BUS_RIDER_PATTERN = /^Bus (\d+) Staff$/i;

/** Check if a session label matches a bus rider pattern */
export function isBusRider(label: string | undefined | null): boolean {
  if (!label) return false;
  return BUS_RIDER_PATTERN.test(label);
}

/** Extract bus number from a bus rider label (e.g. "Bus 1 Staff" -> "1") */
export function extractBusNumber(label: string): string | null {
  const match = label.match(BUS_RIDER_PATTERN);
  return match ? match[1] : null;
}
