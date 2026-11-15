import Mapbox, {
  Camera as MapboxCamera,
  CircleLayer,
  LocationPuck,
  MapView,
  ShapeSource,
  UserLocation as MapboxUserLocation,
} from '@rnmapbox/maps';
import { useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import { StyleSheet } from 'react-native';

import type { MapCanvasHandle, MapCanvasProps } from './types';

// Token público (pk.), vem do .env. É embutido no bundle, como todo EXPO_PUBLIC_*.
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '');

// Estilos padrão do Mapbox. O estilo próprio, com as cores terrain-* lavadas, vem depois.
const STYLE_URL = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
};

export function MapCanvas({
  ref,
  initialCamera,
  scheme,
  onCameraChange,
  onPress,
  showUserLocation = false,
  onUserLocation,
  debugPoints,
  children,
}: MapCanvasProps & { ref?: Ref<MapCanvasHandle> }) {
  const cameraRef = useRef<MapboxCamera>(null);
  const [locationGranted, setLocationGranted] = useState(false);

  useImperativeHandle(ref, () => ({
    flyTo: (center, zoom) => {
      cameraRef.current?.setCamera({
        centerCoordinate: [center[0], center[1]],
        zoomLevel: zoom,
        animationDuration: 800,
        animationMode: 'flyTo',
      });
    },
  }));

  useEffect(() => {
    if (!showUserLocation) return;
    let cancelled = false;
    Mapbox.requestAndroidLocationPermissions().then((granted) => {
      if (!cancelled) setLocationGranted(granted);
    });
    return () => {
      cancelled = true;
    };
  }, [showUserLocation]);

  const debugShape = useMemo<GeoJSON.FeatureCollection | null>(() => {
    if (!debugPoints?.length) return null;
    return {
      type: 'FeatureCollection',
      features: debugPoints.map((p) => ({
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: [p[0], p[1]] },
      })),
    };
  }, [debugPoints]);

  return (
    <MapView
      style={StyleSheet.absoluteFill}
      styleURL={STYLE_URL[scheme]}
      // A névoa projeta em Web Mercator plano: sem globo, rotação ou inclinação.
      projection="mercator"
      rotateEnabled={false}
      pitchEnabled={false}
      scaleBarEnabled={false}
      compassEnabled={false}
      onCameraChanged={(state) => {
        const [lng, lat] = state.properties.center;
        onCameraChange?.({ center: [lng, lat], zoom: state.properties.zoom });
      }}
      onPress={(feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        onPress?.({
          lngLat: [lng, lat],
          point: { x: feature.properties.screenPointX, y: feature.properties.screenPointY },
        });
      }}
    >
      <MapboxCamera
        ref={cameraRef}
        defaultSettings={{
          centerCoordinate: [initialCamera.center[0], initialCamera.center[1]],
          zoomLevel: initialCamera.zoom,
        }}
      />

      {showUserLocation && locationGranted ? (
        <>
          <LocationPuck puckBearingEnabled={false} />
          <MapboxUserLocation
            visible={false}
            onUpdate={(location) => {
              onUserLocation?.({
                lngLat: [location.coords.longitude, location.coords.latitude],
                accuracy: location.coords.accuracy,
              });
            }}
          />
        </>
      ) : null}

      {debugShape ? (
        <ShapeSource id="debug-points" shape={debugShape}>
          <CircleLayer
            id="debug-points-layer"
            style={{
              circleRadius: 4,
              circleColor: '#FF00FF',
              circleStrokeColor: '#FFFFFF',
              circleStrokeWidth: 1,
            }}
          />
        </ShapeSource>
      ) : null}

      {children}
    </MapView>
  );
}
