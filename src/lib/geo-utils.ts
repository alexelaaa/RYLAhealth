/**
 * Geographic utility functions for bus tracking.
 */

const EARTH_RADIUS_MILES = 3958.8;

/** Convert degrees to radians */
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine distance between two points in miles */
export function haversineDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Convert m/s (Geolocation API speed) to mph */
export function msToMph(ms: number): number {
  return ms * 2.23694;
}

/** Estimate ETA in minutes given distance (miles) and speed (m/s) */
export function estimateEtaMinutes(distanceMiles: number, speedMs: number): number | null {
  if (speedMs <= 0.5) return null; // effectively stopped
  const speedMph = msToMph(speedMs);
  return (distanceMiles / speedMph) * 60;
}

/** Format ETA as human-readable string */
export function formatEta(minutes: number | null): string {
  if (minutes === null) return "N/A";
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}
