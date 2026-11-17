import type { ReactNode } from 'react';

import type { Camera, LngLat, Point } from '@/lib/geo';

/**
 * Contrato do mapa. O resto do app só conhece estes tipos; nada fora de
 * src/features/map/ importa o SDK do Mapbox. Trocar por MapLibre significa
 * reescrever só o MapCanvas.
 */

export type MapPressEvent = {
  lngLat: LngLat;
  /** Ponto tocado, em pontos de tela (dp) relativos ao canto do mapa. */
  point: Point;
};

export type UserLocation = {
  lngLat: LngLat;
  /** Precisão horizontal em metros, quando o aparelho informa. */
  accuracy?: number;
};

export type MapCanvasProps = {
  initialCamera: Camera;
  /** Tema do mapa base. */
  scheme: 'dark' | 'light';
  /**
   * Chamado continuamente durante pan e zoom. timestampMs é o instante (relógio
   * do aparelho) em que o mapa gerou a amostra, que chega aqui com atraso.
   */
  onCameraChange?: (camera: Camera, timestampMs: number) => void;
  /** Toque simples. Não dispara em pan, zoom ou toque duplo. */
  onPress?: (event: MapPressEvent) => void;
  /** Mostra o ponto azul e passa a reportar a posição. Pede a permissão se preciso. */
  showUserLocation?: boolean;
  onUserLocation?: (location: UserLocation) => void;
  /** Pontos de depuração desenhados pelo próprio mapa (para conferir a sincronia do overlay). */
  debugPoints?: LngLat[];
  children?: ReactNode;
};

export type MapCanvasHandle = {
  flyTo: (center: LngLat, zoom?: number) => void;
};
