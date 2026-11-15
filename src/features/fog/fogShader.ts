import { HOLE_REACH, MAX_HOLES, NOISE_PERIOD } from './fogMath';

/**
 * Shader da névoa (SkSL, roda na GPU a cada pixel).
 *
 * Ideia geral:
 *  1. Ruído fractal "billow" preso ao mapa dá o relevo de cúmulo: topos
 *     arredondados separados por vincos.
 *  2. Cada buraco contribui para um "campo" com um núcleo suave. Onde o campo
 *     passa de um limiar, a névoa abre. Como os núcleos se somam, buracos
 *     vizinhos se fundem numa forma só (metaball) em vez de virarem círculos.
 *  3. O limiar é perturbado pelo relevo, o que deixa a borda esfiapada.
 *  4. O relevo é iluminado de um lado, o que dá o volume.
 */
export const FOG_SHADER = `
uniform float2 uRes;       // tamanho da tela, em pontos
uniform float  uScale;     // pontos de tela por unidade do canvas (render em resolução reduzida)
uniform float  uTime;      // segundos
uniform float3 uNoiseA;    // offset.xy (células) e células por ponto, nível de zoom inferior
uniform float3 uNoiseB;    // idem, nível superior
uniform float  uBlend;     // mistura entre os dois níveis
uniform float3 uHoles[${MAX_HOLES}]; // x, y, raio (pontos de tela)
uniform float  uHoleCount;
uniform float4 uTap;       // x, y, raio (pontos de tela), força 0..1
uniform float3 uFog;       // cor da névoa
uniform float4 uOutline;   // cor do contorno; alpha 0 desliga

const float PERIOD = ${NOISE_PERIOD}.0;
const float REACH = ${HOLE_REACH}.0;

float hash(float2 p) {
  p = mod(p, PERIOD);
  return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453123);
}

float2 grad(float2 cell) {
  float a = hash(cell) * 6.2831853;
  return float2(cos(a), sin(a));
}

// Ruído de gradiente (tipo Perlin), em torno de 0, aproximadamente em [-0.7, 0.7].
float gnoise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(grad(i), f);
  float b = dot(grad(i + float2(1.0, 0.0)), f - float2(1.0, 0.0));
  float c = dot(grad(i + float2(0.0, 1.0)), f - float2(0.0, 1.0));
  float d = dot(grad(i + float2(1.0, 1.0)), f - float2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Relevo de cúmulo, em [0, 1]. O módulo suavizado cria vincos macios entre os gomos.
// Escalas inteiras entre oitavas mantêm o ruído periódico.
float cloud(float2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    float n = gnoise(p);
    sum += amp * (sqrt(n * n + 0.006) - 0.05) * 2.0;
    p = p * 2.0 + float2(31.0, 17.0);
    amp *= 0.5;
  }
  return clamp(sum / 0.9375, 0.0, 1.0);
}

// Respiração: os gomos incham e deslizam bem devagar.
float2 breathe(float2 p, float t) {
  float2 sway = float2(gnoise(p + float2(0.0, t * 0.05)), gnoise(p + float2(7.0, -t * 0.04)));
  return sway * 0.22 + float2(t * 0.010, t * 0.006);
}

// Núcleo suave de suporte compacto: 1 no centro, 0 a partir de "reach".
float kernel(float dist, float reach) {
  float t = clamp(dist / reach, 0.0, 1.0);
  float k = 1.0 - t * t;
  return k * k * k;
}

float2 noiseCoord(float3 level, float2 fromCenter) {
  return level.xy + fromCenter * level.z;
}

half4 main(float2 fragCoord) {
  float2 xy = fragCoord * uScale;
  float2 fromCenter = xy - uRes * 0.5;

  // Toque: empurra a amostragem do relevo pra fora do ponto tocado.
  float2 tapDir = xy - uTap.xy;
  float tapDist = length(tapDir);
  float tapK = uTap.w * kernel(tapDist, uTap.z * 1.6);
  float2 pushed = fromCenter - normalize(tapDir + float2(0.0001)) * tapK * uTap.z * 0.35;

  float2 pa = noiseCoord(uNoiseA, pushed);
  float2 pb = noiseCoord(uNoiseB, pushed);
  float2 qa = pa + breathe(pa, uTime);
  float2 qb = pb + breathe(pb, uTime);
  float h = mix(cloud(qa), cloud(qb), uBlend);

  // Luz do alto à esquerda: compara com o relevo um passo na direção da luz.
  float2 lightStep = float2(-0.07, -0.09);
  float hLit = mix(cloud(qa + lightStep), cloud(qb + lightStep), uBlend);
  float shade = clamp(0.5 + (h - hLit) * 1.7, 0.0, 1.0);

  // Campo dos buracos permanentes (metaball).
  float field = 0.0;
  for (int i = 0; i < ${MAX_HOLES}; i++) {
    if (float(i) < uHoleCount) {
      float3 hole = uHoles[i];
      field += kernel(distance(xy, hole.xy), hole.z * REACH);
    }
  }
  // Toque: abre temporariamente ao redor do dedo.
  field += uTap.w * kernel(tapDist, uTap.z * REACH) * 1.4;

  // kernel(raio, raio * REACH) = 0.42: o buraco sozinho abre perto do raio.
  // O relevo desloca o limiar só onde já existe campo, pra borda esfiapar
  // sem abrir furos longe dos buracos.
  float fray = (h - 0.42) * 0.75 * smoothstep(0.0, 0.22, field);
  float open = smoothstep(0.26, 0.58, field + fray + 0.01 * sin(uTime * 0.6));
  float alpha = 1.0 - open;

  // Cor: topos na cor da névoa, vincos e lado oposto à luz em sombra fria e suave.
  float3 shadow = uFog * float3(0.83, 0.87, 0.92);
  float3 light = min(uFog * 1.05, float3(1.0));
  float lit = smoothstep(0.2, 0.8, shade) * 0.45 + smoothstep(0.05, 0.55, h) * 0.55;
  float3 color = mix(shadow, light, lit);

  // A névoa fica mais rala perto da borda aberta.
  alpha *= mix(0.82, 1.0, smoothstep(0.0, 0.6, alpha));

  // Contorno (tema claro): faixa na transição entre névoa e mapa.
  float band = smoothstep(0.08, 0.35, alpha) * (1.0 - smoothstep(0.45, 0.80, alpha));
  color = mix(color, uOutline.rgb, band * uOutline.a);

  return half4(color * alpha, alpha);
}
`;
