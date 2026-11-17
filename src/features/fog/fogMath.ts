import { metersToPixels, project, type Camera, type LngLat, type Viewport } from '@/lib/geo';

/**
 * Contas da névoa feitas em JS (precisão dupla) e entregues ao shader já em
 * pontos de tela ou relativas à câmera. O shader trabalha em float de 32 bits,
 * que não tem precisão pra coordenada de mundo em zoom alto.
 */

/** Área aberta de forma permanente por um check-in. */
export type FogHole = {
  lngLat: LngLat;
  radiusMeters: number;
};

/** Máximo de buracos enviados ao shader por quadro (só os visíveis contam). */
export const MAX_HOLES = 32;
/** Tamanho, em pontos de tela, de uma "célula" de ruído no zoom inteiro. */
export const NOISE_CELL_PX = 150;
/** Período do ruído, em células. O hash do shader repete a cada NOISE_PERIOD. */
export const NOISE_PERIOD = 256;
/** Lado, em pixels, da máscara de terra (assets/images/land-mask.png). */
export const LAND_MASK_SIZE = 2048;
/** A área de influência de um buraco vai até este múltiplo do raio. */
export const HOLE_REACH = 2;

export type NoiseLevel = {
  /** Posição do centro da tela no espaço do ruído, já reduzida ao período. */
  offsetX: number;
  offsetY: number;
  /** Células de ruído por ponto de tela. */
  cellsPerPixel: number;
};

export type FogNoise = {
  a: NoiseLevel;
  b: NoiseLevel;
  /** 0 = só o nível a, 1 = só o nível b. */
  blend: number;
};

function mod(value: number, period: number): number {
  return ((value % period) + period) % period;
}

function noiseLevel(camera: Camera, level: number): NoiseLevel {
  // Mercator normalizado do centro, em precisão dupla.
  const lat = (Math.max(-85.051129, Math.min(85.051129, camera.center[1])) * Math.PI) / 180;
  const worldX = camera.center[0] / 360 + 0.5;
  const worldY = 0.5 - Math.log((1 + Math.sin(lat)) / (1 - Math.sin(lat))) / (4 * Math.PI);

  const cellsAcrossWorld = (512 * 2 ** level) / NOISE_CELL_PX;
  return {
    offsetX: mod(worldX * cellsAcrossWorld, NOISE_PERIOD),
    offsetY: mod(worldY * cellsAcrossWorld, NOISE_PERIOD),
    cellsPerPixel: 1 / (NOISE_CELL_PX * 2 ** (camera.zoom - level)),
  };
}

/**
 * A textura da névoa fica presa ao mapa (acompanha o pan) e mantém um tamanho
 * aparente parecido em qualquer zoom: usamos dois níveis de ruído, um para cada
 * zoom inteiro vizinho, e misturamos pela parte fracionária do zoom.
 */
export function computeNoise(camera: Camera): FogNoise {
  const level = Math.floor(camera.zoom);
  return {
    a: noiseLevel(camera, level),
    b: noiseLevel(camera, level + 1),
    blend: camera.zoom - level,
  };
}

export type ProjectedHoles = {
  /** MAX_HOLES trios [x, y, raio] em pontos de tela; o que sobra fica zerado. */
  data: number[];
  count: number;
  /** Posição em data do último buraco da lista (o mais novo), ou -1 se ele não está visível. */
  newestIndex: number;
};

/**
 * Projeta os buracos na tela e descarta os que não alcançam a viewport.
 * minRadiusPx mantém o buraco visível como um ponto quando o zoom está longe.
 */
export function projectHoles(
  holes: readonly FogHole[],
  camera: Camera,
  viewport: Viewport,
  minRadiusPx = 0,
): ProjectedHoles {
  const data = new Array<number>(MAX_HOLES * 3).fill(0);
  let count = 0;
  let newestIndex = -1;

  for (let i = 0; i < holes.length; i++) {
    if (count >= MAX_HOLES) break;
    const hole = holes[i];
    const { x, y } = project(hole.lngLat, camera, viewport);
    const radius = Math.max(
      minRadiusPx,
      metersToPixels(hole.radiusMeters, hole.lngLat[1], camera.zoom),
    );
    const reach = radius * HOLE_REACH;
    const visible =
      x + reach >= 0 &&
      x - reach <= viewport.width &&
      y + reach >= 0 &&
      y - reach <= viewport.height;
    if (!visible) continue;

    data[count * 3] = x;
    data[count * 3 + 1] = y;
    data[count * 3 + 2] = radius;
    if (i === holes.length - 1) newestIndex = count;
    count += 1;
  }

  return { data, count, newestIndex };
}
