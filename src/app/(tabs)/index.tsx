import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FpsCounter } from '@/features/debug/FpsCounter';
import { FogOverlay, type FogHole, type FogOverlayHandle } from '@/features/fog';
import { FOG_CONFIG } from '@/features/fog/config';
import { MapCanvas, type MapCanvasHandle, type UserLocation } from '@/features/map';
import type { Camera } from '@/lib/geo';
import { useTheme } from '@/theme';

// Spike da Fase 1: mapa + névoa, com dados só em memória.
// Visão inicial: o Brasil inteiro. A pessoa aproxima até onde quiser.
const INITIAL_CAMERA: Camera = { center: [-54, -15], zoom: 2.8 };

export default function Mapa() {
  const { colors, typography, space, layout, radius, scheme } = useTheme();
  const insets = useSafeAreaInsets();

  const mapRef = useRef<MapCanvasHandle>(null);
  const fogRef = useRef<FogOverlayHandle>(null);
  const cameraRef = useRef<Camera>(INITIAL_CAMERA);
  const locationRef = useRef<UserLocation | null>(null);

  const [holes, setHoles] = useState<FogHole[]>([]);
  const [hasLocation, setHasLocation] = useState(false);
  const [showMarkers, setShowMarkers] = useState(false);

  const openHoleHere = () => {
    // Sem GPS ainda, usa o centro do mapa pra o teste não travar.
    const lngLat = locationRef.current?.lngLat ?? cameraRef.current.center;
    setHoles((current) => [...current, { lngLat, radiusMeters: FOG_CONFIG.holeRadiusMeters }]);
  };

  const goToLocation = () => {
    if (locationRef.current) mapRef.current?.flyTo(locationRef.current.lngLat, 15);
  };

  const chip = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    minHeight: layout.touchMin,
    paddingHorizontal: space[4],
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <MapCanvas
        ref={mapRef}
        initialCamera={INITIAL_CAMERA}
        scheme={scheme}
        showUserLocation
        debugPoints={showMarkers ? holes.map((hole) => hole.lngLat) : undefined}
        onCameraChange={(camera) => {
          cameraRef.current = camera;
          fogRef.current?.setCamera(camera);
        }}
        onPress={(event) => fogRef.current?.dissipate(event.lngLat)}
        onUserLocation={(location) => {
          locationRef.current = location;
          if (!hasLocation) setHasLocation(true);
        }}
      />

      <FogOverlay
        ref={fogRef}
        initialCamera={INITIAL_CAMERA}
        holes={holes}
        fogColor={colors.fog}
        outlineColor={colors.fogOutline}
        renderScale={FOG_CONFIG.renderScale}
        minHoleRadiusPx={FOG_CONFIG.minHoleRadiusPx}
      />

      {/* Controles de teste do spike. Saem quando o check-in de verdade existir. */}
      <View
        style={[styles.top, { top: insets.top + space[2], left: layout.screenMargin }]}
        pointerEvents="box-none"
      >
        <FpsCounter />
      </View>

      <View
        style={[
          styles.bottom,
          { bottom: space[4], paddingHorizontal: layout.screenMargin, gap: space[2] },
        ]}
        pointerEvents="box-none"
      >
        <View style={[styles.row, { gap: space[2] }]}>
          <Pressable
            onPress={() => setShowMarkers((value) => !value)}
            style={[styles.center, chip]}
          >
            <Text style={[typography.label, { color: colors.textPrimary }]}>
              {showMarkers ? 'Ocultar marcadores' : 'Marcadores'}
            </Text>
          </Pressable>
          <Pressable
            onPress={goToLocation}
            disabled={!hasLocation}
            style={[styles.center, chip, { opacity: hasLocation ? 1 : 0.5 }]}
          >
            <Text style={[typography.label, { color: colors.textPrimary }]}>Minha posição</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={openHoleHere}
          style={({ pressed }) => [
            styles.center,
            {
              backgroundColor: pressed ? colors.actionHover : colors.action,
              borderRadius: radius.control,
              minHeight: layout.touchMin,
            },
          ]}
        >
          <Text style={[typography.heading, { color: colors.onAction }]}>
            {hasLocation ? 'Abrir névoa na minha posição' : 'Abrir névoa no centro do mapa'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  top: { position: 'absolute' },
  bottom: { position: 'absolute', left: 0, right: 0 },
  row: { flexDirection: 'row' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
