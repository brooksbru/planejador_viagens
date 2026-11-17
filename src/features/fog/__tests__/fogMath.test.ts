import type { Camera } from '@/lib/geo';

import {
  computeNoise,
  MAX_HOLES,
  NOISE_CELL_PX,
  NOISE_PERIOD,
  projectHoles,
  type FogHole,
} from '../fogMath';

const LISBOA: Camera = { center: [-9.1393, 38.7223], zoom: 14 };
const VIEWPORT = { width: 400, height: 800 };

describe('computeNoise', () => {
  it('mantém os offsets dentro do período do ruído', () => {
    for (const zoom of [0, 3.3, 10, 14.7, 20]) {
      const noise = computeNoise({ ...LISBOA, zoom });
      for (const level of [noise.a, noise.b]) {
        expect(level.offsetX).toBeGreaterThanOrEqual(0);
        expect(level.offsetX).toBeLessThan(NOISE_PERIOD);
        expect(level.offsetY).toBeGreaterThanOrEqual(0);
        expect(level.offsetY).toBeLessThan(NOISE_PERIOD);
      }
    }
  });

  it('no zoom inteiro usa só o nível a, com a célula no tamanho base', () => {
    const noise = computeNoise({ ...LISBOA, zoom: 14 });
    expect(noise.blend).toBe(0);
    expect(noise.a.cellsPerPixel).toBeCloseTo(1 / NOISE_CELL_PX, 12);
    expect(noise.b.cellsPerPixel).toBeCloseTo(2 / NOISE_CELL_PX, 12);
  });

  it('não dá salto ao cruzar um zoom inteiro', () => {
    // Logo abaixo de 15, o nível b (peso ~1) tem que ser o mesmo que o nível a logo acima.
    const abaixo = computeNoise({ ...LISBOA, zoom: 15 - 1e-9 });
    const acima = computeNoise({ ...LISBOA, zoom: 15 + 1e-9 });
    expect(abaixo.blend).toBeCloseTo(1, 6);
    expect(acima.blend).toBeCloseTo(0, 6);
    expect(abaixo.b.offsetX).toBeCloseTo(acima.a.offsetX, 6);
    expect(abaixo.b.offsetY).toBeCloseTo(acima.a.offsetY, 6);
    expect(abaixo.b.cellsPerPixel).toBeCloseTo(acima.a.cellsPerPixel, 9);
  });

  it('prende a textura ao mapa: o offset anda junto com o pan', () => {
    const antes = computeNoise(LISBOA);
    // Desloca a câmera o equivalente a 30 pontos de tela para leste.
    const grausPorPonto = 360 / (512 * 2 ** LISBOA.zoom);
    const depois = computeNoise({
      ...LISBOA,
      center: [LISBOA.center[0] + 30 * grausPorPonto, LISBOA.center[1]],
    });
    const andou = (depois.a.offsetX - antes.a.offsetX) / antes.a.cellsPerPixel;
    expect(andou).toBeCloseTo(30, 4);
    expect(depois.a.offsetY).toBeCloseTo(antes.a.offsetY, 9);
  });
});

describe('projectHoles', () => {
  const noCentro: FogHole = { lngLat: LISBOA.center, radiusMeters: 300 };

  it('projeta o buraco do centro da câmera no centro da tela, com o raio em pontos', () => {
    const { data, count } = projectHoles([noCentro], LISBOA, VIEWPORT);
    expect(count).toBe(1);
    expect(data[0]).toBeCloseTo(200, 6);
    expect(data[1]).toBeCloseTo(400, 6);
    // ~3,73 m por ponto em Lisboa no zoom 14.
    expect(data[2]).toBeGreaterThan(78);
    expect(data[2]).toBeLessThan(83);
  });

  it('dobra o raio na tela a cada nível de zoom', () => {
    const z14 = projectHoles([noCentro], LISBOA, VIEWPORT).data[2];
    const z15 = projectHoles([noCentro], { ...LISBOA, zoom: 15 }, VIEWPORT).data[2];
    expect(z15 / z14).toBeCloseTo(2, 9);
  });

  it('descarta buracos fora da tela e mantém os que só encostam nela', () => {
    const longe: FogHole = { lngLat: [-8.6291, 41.1579], radiusMeters: 300 }; // Porto
    // 500 m a leste do centro: fora da tela de 400 pontos (~134 pontos), mas a área de influência alcança.
    const naBorda: FogHole = {
      lngLat: [LISBOA.center[0] + 0.0105, LISBOA.center[1]],
      radiusMeters: 300,
    };
    const { count } = projectHoles([longe, naBorda], LISBOA, VIEWPORT);
    expect(count).toBe(1);
  });

  it('aplica o raio mínimo quando o zoom está longe', () => {
    const { data } = projectHoles([noCentro], { ...LISBOA, zoom: 3 }, VIEWPORT, 5);
    expect(data[2]).toBe(5);
  });

  it('informa onde ficou o buraco mais novo, ou -1 se ele não está visível', () => {
    const longe: FogHole = { lngLat: [-8.6291, 41.1579], radiusMeters: 300 };
    expect(projectHoles([longe, noCentro], LISBOA, VIEWPORT).newestIndex).toBe(0);
    expect(projectHoles([noCentro, longe], LISBOA, VIEWPORT).newestIndex).toBe(-1);
    expect(projectHoles([], LISBOA, VIEWPORT).newestIndex).toBe(-1);
  });

  it('respeita o limite de buracos do shader', () => {
    const muitos = Array.from({ length: MAX_HOLES + 10 }, () => noCentro);
    const { data, count } = projectHoles(muitos, LISBOA, VIEWPORT);
    expect(count).toBe(MAX_HOLES);
    expect(data).toHaveLength(MAX_HOLES * 3);
  });
});
