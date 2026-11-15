import { Canvas, Fill, Shader, Skia, useClock } from '@shopify/react-native-skia';
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import {
  Easing,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { lngLatToWorld, project, worldSize, type Camera, type LngLat } from '@/lib/geo';

import { computeNoise, MAX_HOLES, projectHoles, type FogHole } from './fogMath';
import { FOG_SHADER } from './fogShader';

const effect = Skia.RuntimeEffect.Make(FOG_SHADER);
if (!effect) console.error('Névoa: o shader não compilou.');

/** Raio, em pontos de tela, da área que a camada densa desocupa ao toque. */
const TAP_RADIUS = 96;
/** A camada densa abre rápido e começa a fechar em seguida, de forma gradual. */
const TAP_OPEN_MS = 260;
// A abertura some de vista um pouco antes do fim da animação (~1,8 s de fechamento visível).
const TAP_CLOSE_MS = 2300;

// Previsão do pan (ver o comentário junto do useFrameCallback).
/**
 * Ajuste somado ao tempo decorrido desde a amostra. Negativo porque o mapa
 * também demora a desenhar a câmera que anunciou, então a névoa não precisa
 * adiantar o tempo todo. Calibrado medindo o desvio no emulador (ver
 * docs/fase-1.md); pode precisar de ajuste em aparelho real.
 */
const PIPELINE_MS = -8;
/** Teto de quanto adiantar, pra um atraso anormal não jogar a névoa longe. */
const PREDICT_MAX_MS = 70;
/** Sem amostra nova por mais que isso, a previsão começa a sumir. */
const PREDICT_HOLD_MS = 90;

export type FogOverlayHandle = {
  /**
   * Avisa a névoa de cada mudança de câmera do mapa. timestampMs é o instante
   * (relógio do aparelho) em que o mapa gerou a amostra.
   */
  setCamera: (camera: Camera, timestampMs?: number) => void;
  /** Abre a camada densa ao redor do ponto; ela fecha de volta em seguida. A fina fica. */
  dissipate: (lngLat: LngLat) => void;
};

export type FogOverlayProps = {
  ref?: Ref<FogOverlayHandle>;
  initialCamera: Camera;
  /** Buracos permanentes. O último da lista é tratado como o recém-aberto e abre animado. */
  holes: readonly FogHole[];
  fogColor: string;
  /** Contorno da névoa; 'transparent' desliga (tema escuro). */
  outlineColor: string;
  /** Fator de redução da resolução de render. 2 = metade em cada eixo. */
  renderScale?: number;
  /** Raio mínimo de um buraco na tela, pra ele não sumir com o zoom longe. */
  minHoleRadiusPx?: number;
  /** Prevê a posição da câmera durante o pan, pra compensar o atraso do aviso de câmera. */
  predictPan?: boolean;
  /** Desenha uma mira no centro de cada buraco, pra comparar com um marcador do mapa. */
  debugCenters?: boolean;
};

type Frame = {
  noiseA: number[];
  noiseB: number[];
  blend: number;
  holes: number[];
  holeCount: number;
  newestIndex: number;
  tap: number[];
  /** Instante da amostra de câmera (ms, relógio do aparelho). 0 = sem amostra. */
  ts: number;
  /** Velocidade do pan em pontos de tela por ms. */
  vx: number;
  vy: number;
};

const EMPTY_FRAME: Frame = {
  noiseA: [0, 0, 0.005],
  noiseB: [0, 0, 0.01],
  blend: 0,
  holes: new Array<number>(MAX_HOLES * 3).fill(0),
  holeCount: 0,
  newestIndex: -1,
  tap: [0, 0],
  ts: 0,
  vx: 0,
  vy: 0,
};

export function FogOverlay({
  ref,
  initialCamera,
  holes,
  fogColor,
  outlineColor,
  renderScale = 2,
  minHoleRadiusPx = 0,
  predictPan = false,
  debugCenters = false,
}: FogOverlayProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Estado que muda a cada quadro de câmera fica em refs e shared values:
  // passar por estado do React re-renderizaria a tela inteira a 60 fps.
  const cameraRef = useRef<Camera>(initialCamera);
  const tapRef = useRef<LngLat | null>(null);
  const holesRef = useRef(holes);
  const sizeRef = useRef(size);
  const minRadiusRef = useRef(minHoleRadiusPx);
  // Última amostra de câmera com carimbo de tempo, pra medir a velocidade do pan.
  const sampleRef = useRef({ cx: 0, cy: 0, zoom: 0, ts: 0, vx: 0, vy: 0 });

  const frame = useSharedValue<Frame>(EMPTY_FRAME);
  const tapStrength = useSharedValue(0);
  const reveal = useSharedValue(1);
  const clock = useClock();

  const recompute = useCallback(() => {
    const viewport = sizeRef.current;
    if (viewport.width === 0) return;
    const camera = cameraRef.current;
    const noise = computeNoise(camera);
    const projected = projectHoles(holesRef.current, camera, viewport, minRadiusRef.current);
    const tap = tapRef.current ? project(tapRef.current, camera, viewport) : { x: 0, y: 0 };
    const sample = sampleRef.current;

    frame.set({
      noiseA: [noise.a.offsetX, noise.a.offsetY, noise.a.cellsPerPixel],
      noiseB: [noise.b.offsetX, noise.b.offsetY, noise.b.cellsPerPixel],
      blend: noise.blend,
      holes: projected.data,
      holeCount: projected.count,
      newestIndex: projected.newestIndex,
      tap: [tap.x, tap.y],
      ts: sample.ts,
      vx: sample.vx,
      vy: sample.vy,
    });
  }, [frame]);

  useImperativeHandle(ref, () => ({
    setCamera: (camera, timestampMs) => {
      cameraRef.current = camera;
      if (timestampMs) {
        const prev = sampleRef.current;
        const center = lngLatToWorld(camera.center);
        const size = worldSize(camera.zoom);
        const cx = center.x * size;
        const cy = center.y * size;
        const dt = timestampMs - prev.ts;
        let vx = 0;
        let vy = 0;
        // Só prevê pan puro (zoom igual) e com amostras próximas no tempo.
        if (dt > 0 && dt < 120 && camera.zoom === prev.zoom) {
          vx = 0.4 * prev.vx + (0.6 * (cx - prev.cx)) / dt;
          vy = 0.4 * prev.vy + (0.6 * (cy - prev.cy)) / dt;
        }
        sampleRef.current = { cx, cy, zoom: camera.zoom, ts: timestampMs, vx, vy };
      }
      recompute();
    },
    dissipate: (lngLat) => {
      tapRef.current = lngLat;
      recompute();
      tapStrength.set(
        withSequence(
          withTiming(1, { duration: TAP_OPEN_MS, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: TAP_CLOSE_MS, easing: Easing.inOut(Easing.quad) }),
        ),
      );
    },
  }));

  const holeCount = holes.length;
  const previousCount = useRef(holeCount);
  useEffect(() => {
    holesRef.current = holes;
    minRadiusRef.current = minHoleRadiusPx;
    if (holeCount > previousCount.current) {
      // Buraco novo: abre crescendo a partir do centro.
      reveal.set(0);
      reveal.set(withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) }));
    }
    previousCount.current = holeCount;
    recompute();
  }, [holes, holeCount, minHoleRadiusPx, recompute, reveal]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    sizeRef.current = { width, height };
    setSize({ width, height });
    recompute();
  };

  const fog = Skia.Color(fogColor);
  const outline = Skia.Color(outlineColor);
  const fogRgb = [fog[0], fog[1], fog[2]];
  const outlineRgba = [outline[0], outline[1], outline[2], outline[3]];
  const { width, height } = size;

  // Previsão do pan. O mapa avisa a mudança de câmera com atraso (nativo → JS →
  // aqui), então num arrasto rápido a névoa ficaria pra trás. Cada amostra de
  // câmera traz o instante em que foi gerada; a cada quadro, na thread de UI,
  // adiantamos a névoa pelo tempo decorrido desde a amostra, na velocidade
  // medida entre as duas últimas. Sem amostra nova a previsão some, pra névoa
  // não passar do ponto quando o mapa para.
  const shift = useSharedValue([0, 0]);

  useFrameCallback(() => {
    'worklet';
    const f = frame.value;
    if (!predictPan || f.ts === 0 || (f.vx === 0 && f.vy === 0)) {
      if (shift.value[0] !== 0 || shift.value[1] !== 0) shift.value = [0, 0];
      return;
    }
    const lead = Date.now() - f.ts + PIPELINE_MS;
    const fade = lead > PREDICT_HOLD_MS ? Math.max(0, 1 - (lead - PREDICT_HOLD_MS) / 100) : 1;
    const ahead = Math.min(lead, PREDICT_MAX_MS) * fade;
    shift.value = [f.vx * ahead, f.vy * ahead];
  });

  const uniforms = useDerivedValue(() => {
    const f = frame.value;
    const [sx, sy] = shift.value;
    const moving = sx !== 0 || sy !== 0;
    let holeData = f.holes;
    if (moving || (reveal.value < 1 && f.newestIndex >= 0)) {
      holeData = f.holes.slice();
      if (f.newestIndex >= 0) holeData[f.newestIndex * 3 + 2] *= reveal.value;
      // A câmera andando +x leva o conteúdo pra -x na tela.
      for (let i = 0; i < f.holeCount; i++) {
        holeData[i * 3] -= sx;
        holeData[i * 3 + 1] -= sy;
      }
    }
    return {
      uRes: [width, height],
      uScale: renderScale,
      uTime: clock.value / 1000,
      uNoiseA: [f.noiseA[0] + sx * f.noiseA[2], f.noiseA[1] + sy * f.noiseA[2], f.noiseA[2]],
      uNoiseB: [f.noiseB[0] + sx * f.noiseB[2], f.noiseB[1] + sy * f.noiseB[2], f.noiseB[2]],
      uBlend: f.blend,
      uHoles: holeData,
      uHoleCount: f.holeCount,
      uTap: [f.tap[0] - sx, f.tap[1] - sy, TAP_RADIUS, tapStrength.value],
      uFog: fogRgb,
      uOutline: outlineRgba,
      uDebug: debugCenters ? 1 : 0,
    };
  });

  return (
    // pointerEvents="none": todo toque atravessa a névoa e chega ao mapa.
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
      {effect && width > 0 ? (
        <Canvas
          style={{
            width: width / renderScale,
            height: height / renderScale,
            transformOrigin: 'top left',
            transform: [{ scale: renderScale }],
          }}
        >
          <Fill>
            <Shader source={effect} uniforms={uniforms} />
          </Fill>
        </Canvas>
      ) : null}
    </View>
  );
}
