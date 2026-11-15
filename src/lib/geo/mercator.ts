/**
 * Projeção Web Mercator, a mesma do Mapbox e do MapLibre.
 *
 * "Mundo" aqui é o plano normalizado: x e y em [0, 1], com (0, 0) no canto
 * noroeste. Tudo em número de precisão dupla (JS); o shader da névoa só recebe
 * valores já relativos à câmera, porque float de 32 bits não aguenta
 * coordenada de mundo em zoom alto.
 */

/** [longitude, latitude] em graus, na ordem que o Mapbox usa. */
export type LngLat = readonly [number, number];
export type Point = { x: number; y: number };

export type Camera = {
  center: LngLat;
  zoom: number;
};

export type Viewport = { width: number; height: number };

/** Lado do mundo em pontos de tela (dp) no zoom 0. O Mapbox usa tiles de 512. */
export const TILE_SIZE = 512;
/** Circunferência da Terra no equador, em metros. */
export const EARTH_CIRCUMFERENCE = 40075016.686;
/** Latitude máxima representável no Web Mercator. */
export const MAX_LATITUDE = 85.051129;

const DEG = Math.PI / 180;

export function clampLatitude(lat: number): number {
  return Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, lat));
}

export function lngLatToWorld([lng, lat]: LngLat): Point {
  const sin = Math.sin(clampLatitude(lat) * DEG);
  return {
    x: lng / 360 + 0.5,
    y: 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI),
  };
}

export function worldToLngLat({ x, y }: Point): LngLat {
  const lng = (x - 0.5) * 360;
  const lat = (2 * Math.atan(Math.exp((0.5 - y) * 2 * Math.PI)) - Math.PI / 2) / DEG;
  return [lng, lat];
}

/** Lado do mundo em pontos de tela num dado zoom. */
export function worldSize(zoom: number): number {
  return TILE_SIZE * 2 ** zoom;
}

/**
 * Coordenada geográfica → ponto na tela (dp), com a câmera no centro da
 * viewport. Vale para mapa sem rotação e sem inclinação.
 */
export function project(lngLat: LngLat, camera: Camera, viewport: Viewport): Point {
  const size = worldSize(camera.zoom);
  const p = lngLatToWorld(lngLat);
  const c = lngLatToWorld(camera.center);
  // Menor caminho em x: o mundo dá a volta no antimeridiano.
  let dx = p.x - c.x;
  if (dx > 0.5) dx -= 1;
  if (dx < -0.5) dx += 1;
  return {
    x: viewport.width / 2 + dx * size,
    y: viewport.height / 2 + (p.y - c.y) * size,
  };
}

/** Inverso de project. */
export function unproject(point: Point, camera: Camera, viewport: Viewport): LngLat {
  const size = worldSize(camera.zoom);
  const c = lngLatToWorld(camera.center);
  return worldToLngLat({
    x: c.x + (point.x - viewport.width / 2) / size,
    y: c.y + (point.y - viewport.height / 2) / size,
  });
}

/** Quantos metros no chão cabem em um ponto de tela, naquela latitude e zoom. */
export function metersPerPixel(lat: number, zoom: number): number {
  return (EARTH_CIRCUMFERENCE * Math.cos(clampLatitude(lat) * DEG)) / worldSize(zoom);
}

/** Raio em metros → raio em pontos de tela. */
export function metersToPixels(meters: number, lat: number, zoom: number): number {
  return meters / metersPerPixel(lat, zoom);
}
