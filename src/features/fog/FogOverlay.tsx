import { Canvas, Fill, Shader, Skia, useClock } from '@shopify/react-native-skia';
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { project, type Camera, type LngLat } from '@/lib/geo';

import { computeNoise, MAX_HOLES, projectHoles, type FogHole } from './fogMath';
import { FOG_SHADER } from './fogShader';

const effect = Skia.RuntimeEffect.Make(FOG_SHADER);
if (!effect) console.error('Névoa: o shader não compilou.');

/** Raio, em pontos de tela, da área que a camada densa desocupa ao toque. */
const TAP_RADIUS = 84;
/** A camada densa abre rápido e começa a fechar em seguida, de forma gradual. */
const TAP_OPEN_MS = 260;
const TAP_CLOSE_MS = 1900;

export type FogOverlayHandle = {
  /** Avisa a névoa de cada mudança de câmera do mapa. */
  setCamera: (camera: Camera) => void;
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
};

type Frame = {
  noiseA: number[];
  noiseB: number[];
  blend: number;
  holes: number[];
  holeCount: number;
  newestIndex: number;
  tap: number[];
};

const EMPTY_FRAME: Frame = {
  noiseA: [0, 0, 0.005],
  noiseB: [0, 0, 0.01],
  blend: 0,
  holes: new Array<number>(MAX_HOLES * 3).fill(0),
  holeCount: 0,
  newestIndex: -1,
  tap: [0, 0],
};

export function FogOverlay({
  ref,
  initialCamera,
  holes,
  fogColor,
  outlineColor,
  renderScale = 2,
  minHoleRadiusPx = 0,
}: FogOverlayProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Estado que muda a cada quadro de câmera fica em refs e shared values:
  // passar por estado do React re-renderizaria a tela inteira a 60 fps.
  const cameraRef = useRef<Camera>(initialCamera);
  const tapRef = useRef<LngLat | null>(null);
  const holesRef = useRef(holes);
  const sizeRef = useRef(size);
  const minRadiusRef = useRef(minHoleRadiusPx);

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

    frame.set({
      noiseA: [noise.a.offsetX, noise.a.offsetY, noise.a.cellsPerPixel],
      noiseB: [noise.b.offsetX, noise.b.offsetY, noise.b.cellsPerPixel],
      blend: noise.blend,
      holes: projected.data,
      holeCount: projected.count,
      newestIndex: projected.newestIndex,
      tap: [tap.x, tap.y],
    });
  }, [frame]);

  useImperativeHandle(ref, () => ({
    setCamera: (camera) => {
      cameraRef.current = camera;
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

  const uniforms = useDerivedValue(() => {
    const f = frame.value;
    let holeData = f.holes;
    if (reveal.value < 1 && f.newestIndex >= 0) {
      holeData = f.holes.slice();
      holeData[f.newestIndex * 3 + 2] *= reveal.value;
    }
    return {
      uRes: [width, height],
      uScale: renderScale,
      uTime: clock.value / 1000,
      uNoiseA: f.noiseA,
      uNoiseB: f.noiseB,
      uBlend: f.blend,
      uHoles: holeData,
      uHoleCount: f.holeCount,
      uTap: [f.tap[0], f.tap[1], TAP_RADIUS, tapStrength.value],
      uFog: fogRgb,
      uOutline: outlineRgba,
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
