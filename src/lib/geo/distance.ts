import type { LngLat } from './mercator';

const EARTH_RADIUS = 6371008.8; // raio médio, em metros
const DEG = Math.PI / 180;

/** Distância em metros entre dois pontos, pela fórmula de haversine. */
export function distanceMeters([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const dLat = (lat2 - lat1) * DEG;
  const dLng = (lng2 - lng1) * DEG;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** O ponto está dentro do raio (em metros) ao redor do centro? */
export function isWithinRadius(point: LngLat, center: LngLat, radiusMeters: number): boolean {
  return distanceMeters(point, center) <= radiusMeters;
}
