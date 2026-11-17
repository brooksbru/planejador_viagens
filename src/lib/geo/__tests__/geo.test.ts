import {
  distanceMeters,
  isWithinRadius,
  lngLatToWorld,
  metersPerPixel,
  metersToPixels,
  project,
  unproject,
  worldSize,
  worldToLngLat,
  type Camera,
  type LngLat,
} from '..';

const LISBOA: LngLat = [-9.1393, 38.7223];
const PORTO: LngLat = [-8.6291, 41.1579];
const VIEWPORT = { width: 400, height: 800 };

describe('Web Mercator', () => {
  it('coloca [0, 0] no centro do mundo', () => {
    const p = lngLatToWorld([0, 0]);
    expect(p.x).toBeCloseTo(0.5, 12);
    expect(p.y).toBeCloseTo(0.5, 12);
  });

  it('coloca o noroeste em (0, 0) e o sudeste em (1, 1)', () => {
    const nw = lngLatToWorld([-180, 85.051129]);
    const se = lngLatToWorld([180, -85.051129]);
    expect(nw.x).toBeCloseTo(0, 6);
    expect(nw.y).toBeCloseTo(0, 6);
    expect(se.x).toBeCloseTo(1, 6);
    expect(se.y).toBeCloseTo(1, 6);
  });

  it('limita a latitude em vez de devolver infinito nos polos', () => {
    expect(Number.isFinite(lngLatToWorld([0, 90]).y)).toBe(true);
    expect(Number.isFinite(lngLatToWorld([0, -90]).y)).toBe(true);
  });

  it('vai e volta sem perder precisão', () => {
    const [lng, lat] = worldToLngLat(lngLatToWorld(LISBOA));
    expect(lng).toBeCloseTo(LISBOA[0], 9);
    expect(lat).toBeCloseTo(LISBOA[1], 9);
  });

  it('dobra o tamanho do mundo a cada nível de zoom', () => {
    expect(worldSize(0)).toBe(512);
    expect(worldSize(1)).toBe(1024);
    expect(worldSize(10.5) / worldSize(9.5)).toBeCloseTo(2, 12);
  });
});

describe('project / unproject', () => {
  const camera: Camera = { center: LISBOA, zoom: 14 };

  it('projeta o centro da câmera no centro da tela', () => {
    expect(project(LISBOA, camera, VIEWPORT)).toEqual({ x: 200, y: 400 });
  });

  it('põe o leste à direita e o norte para cima', () => {
    const leste = project([LISBOA[0] + 0.01, LISBOA[1]], camera, VIEWPORT);
    const norte = project([LISBOA[0], LISBOA[1] + 0.01], camera, VIEWPORT);
    expect(leste.x).toBeGreaterThan(200);
    expect(leste.y).toBeCloseTo(400, 6);
    expect(norte.y).toBeLessThan(400);
    expect(norte.x).toBeCloseTo(200, 6);
  });

  it('dobra a distância ao centro quando o zoom sobe um nível', () => {
    const ponto: LngLat = [LISBOA[0] + 0.01, LISBOA[1] + 0.005];
    const a = project(ponto, camera, VIEWPORT);
    const b = project(ponto, { ...camera, zoom: 15 }, VIEWPORT);
    expect(b.x - 200).toBeCloseTo((a.x - 200) * 2, 6);
    expect(b.y - 400).toBeCloseTo((a.y - 400) * 2, 6);
  });

  it('acompanha o pan: mover a câmera desloca o ponto no sentido oposto', () => {
    const antes = project(LISBOA, camera, VIEWPORT);
    const depois = project(LISBOA, { ...camera, center: [LISBOA[0] + 0.01, LISBOA[1]] }, VIEWPORT);
    expect(depois.x).toBeLessThan(antes.x);
  });

  it('usa o caminho curto ao cruzar o antimeridiano', () => {
    const p = project([-179.99, 0], { center: [179.99, 0], zoom: 10 }, VIEWPORT);
    expect(p.x).toBeGreaterThan(200);
    expect(p.x - 200).toBeLessThan(100);
  });

  it('unproject desfaz project', () => {
    const ponto: LngLat = [-9.13, 38.715];
    const [lng, lat] = unproject(project(ponto, camera, VIEWPORT), camera, VIEWPORT);
    expect(lng).toBeCloseTo(ponto[0], 9);
    expect(lat).toBeCloseTo(ponto[1], 9);
  });
});

describe('metros e pixels', () => {
  it('bate com a escala conhecida do equador no zoom 0', () => {
    expect(metersPerPixel(0, 0)).toBeCloseTo(78271.517, 2);
  });

  it('encolhe com o cosseno da latitude', () => {
    expect(metersPerPixel(60, 10) / metersPerPixel(0, 10)).toBeCloseTo(0.5, 6);
  });

  it('converte o raio de check-in em pixels de forma coerente com a projeção', () => {
    // 100 m ao norte de Lisboa, medidos pela projeção, devem dar o mesmo que metersToPixels.
    const zoom = 16;
    const camera: Camera = { center: LISBOA, zoom };
    const grausPor100m = 100 / 111320;
    const norte = project([LISBOA[0], LISBOA[1] + grausPor100m], camera, VIEWPORT);
    const pelaProjecao = 400 - norte.y;
    expect(metersToPixels(100, LISBOA[1], zoom)).toBeCloseTo(pelaProjecao, 0);
  });
});

describe('distância', () => {
  it('é zero para o mesmo ponto', () => {
    expect(distanceMeters(LISBOA, LISBOA)).toBe(0);
  });

  it('mede Lisboa–Porto em cerca de 274 km', () => {
    const d = distanceMeters(LISBOA, PORTO);
    expect(d).toBeGreaterThan(272000);
    expect(d).toBeLessThan(276000);
  });

  it('é simétrica', () => {
    expect(distanceMeters(LISBOA, PORTO)).toBeCloseTo(distanceMeters(PORTO, LISBOA), 6);
  });

  it('decide se um ponto está dentro do raio', () => {
    const a90m: LngLat = [LISBOA[0], LISBOA[1] + 90 / 111320];
    const a110m: LngLat = [LISBOA[0], LISBOA[1] + 110 / 111320];
    expect(isWithinRadius(a90m, LISBOA, 100)).toBe(true);
    expect(isWithinRadius(a110m, LISBOA, 100)).toBe(false);
  });
});
