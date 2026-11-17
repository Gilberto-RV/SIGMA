import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Map as MapLibreMap,
  Camera,
  GeoJSONSource,
  Layer,
  Marker,
  NativeUserLocation,
} from '@maplibre/maplibre-react-native';
import { School } from 'lucide-react-native';
import { getMapTilerApiKey, isMapTilerConfigured } from '../../../core/config/mapConfig';
import { routeResultToGeoJSON } from '../../../core/utils/routeAdapters';
import {
  SIGMA_MAP_DEFAULT_PROPS,
  SIGMA_MAP_COLORS,
  SIGMA_CAMPUS_BOUNDS,
  SIGMA_MIN_ZOOM,
  SIGMA_MAX_ZOOM,
} from './SigmaMapContract';

/**
 * Estilo base de respaldo sin API key (OpenFreeMap "Liberty", datos de OpenStreetMap).
 * Se usa si no hay EXPO_PUBLIC_MAPTILER_API_KEY o si MapTiler rechaza la carga del estilo,
 * por ejemplo cuando la clave está restringida por Referer (las peticiones nativas no lo envían).
 */
export const FALLBACK_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

const EMPTY_COLLECTION = { type: 'FeatureCollection', features: [] };

// MapLibre RN usa límites [oeste, sur, este, norte].
const CAMPUS_MAX_BOUNDS = [
  SIGMA_CAMPUS_BOUNDS[0][0],
  SIGMA_CAMPUS_BOUNDS[0][1],
  SIGMA_CAMPUS_BOUNDS[1][0],
  SIGMA_CAMPUS_BOUNDS[1][1],
];

const getPrimaryStyleUrl = () => {
  if (!isMapTilerConfigured()) return FALLBACK_STYLE_URL;
  try {
    return `https://api.maptiler.com/maps/streets-v2/style.json?key=${getMapTilerApiKey()}`;
  } catch (e) {
    return FALLBACK_STYLE_URL;
  }
};

const getSelectedId = (selectedBuilding) => {
  if (!selectedBuilding) return '';
  if (typeof selectedBuilding === 'string') return selectedBuilding;
  return selectedBuilding?.properties?.id || selectedBuilding?.id || '';
};

const withoutUndefined = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));

/**
 * Componente SigmaMap para Android/iOS implementado con MapLibre React Native (v11).
 * Cumple el contrato de SigmaMapContract.js y expone la misma API imperativa que SigmaMapWeb.
 */
export const SigmaMapNative = forwardRef(function SigmaMapNative(
  {
    initialCenter = SIGMA_MAP_DEFAULT_PROPS.initialCenter,
    initialZoom = SIGMA_MAP_DEFAULT_PROPS.initialZoom,
    buildings = null,
    paths = null,
    entrances = null,
    campusBoundary = null,
    userLocation = null,
    isSimulatedUser = false,
    buildingMarkers = [],
    selectedBuilding = null,
    onBuildingPress = null,
    onMapPress = null,
    routeResult = null,
    colors: colorOverrides = null,
    interactive = true,
    style,
  },
  ref
) {
  const cameraRef = useRef(null);
  // En Android el toque sobre un Marker también llega a Map.onPress; esta marca de tiempo evita
  // que ese mismo toque se interprete como "zona libre" y cierre la selección recién hecha.
  const featurePressAtRef = useRef(0);
  const [styleUrl, setStyleUrl] = useState(getPrimaryStyleUrl);

  const colors = useMemo(
    () => ({ ...SIGMA_MAP_COLORS, ...(colorOverrides || {}) }),
    [colorOverrides]
  );

  const selectedId = getSelectedId(selectedBuilding);

  useImperativeHandle(ref, () => ({
    flyTo: ({ center, zoom, duration = 800, pitch, bearing } = {}) => {
      if (!cameraRef.current || !Array.isArray(center)) return;
      try {
        const pending = cameraRef.current.flyTo(
          withoutUndefined({ center, zoom, duration, pitch, bearing })
        );
        if (pending && typeof pending.catch === 'function') {
          pending.catch((err) => console.warn('[SigmaMapNative] flyTo falló:', err?.message));
        }
      } catch (err) {
        // El Camera nativo lanza si el mapa aún no termina de inicializarse.
        console.warn('[SigmaMapNative] flyTo ignorado, mapa no inicializado:', err?.message);
      }
    },
  }));

  const routeCollection = useMemo(() => {
    if (!routeResult) return EMPTY_COLLECTION;
    try {
      return { type: 'FeatureCollection', features: [routeResultToGeoJSON(routeResult)] };
    } catch (err) {
      console.warn('[SigmaMapNative] routeResult inválido:', err.message);
      return EMPTY_COLLECTION;
    }
  }, [routeResult]);

  const handleDidFailLoadingMap = useCallback(() => {
    if (styleUrl !== FALLBACK_STYLE_URL) {
      console.warn(
        '[SigmaMapNative] No se pudo cargar el estilo de MapTiler (¿clave restringida por Referer?). ' +
          'Usando estilo de respaldo OpenFreeMap.'
      );
      setStyleUrl(FALLBACK_STYLE_URL);
    }
  }, [styleUrl]);

  const handleBuildingSourcePress = useCallback(
    (event) => {
      const feature = event?.nativeEvent?.features?.[0];
      if (!feature) return;
      event.stopPropagation?.();
      featurePressAtRef.current = Date.now();
      onBuildingPress?.(feature);
    },
    [onBuildingPress]
  );

  const handleMarkerPress = useCallback(
    (event, marker) => {
      event?.stopPropagation?.();
      featurePressAtRef.current = Date.now();
      onBuildingPress?.({
        type: 'Feature',
        id: marker.id,
        properties: { id: marker.id, name: marker.name },
      });
    },
    [onBuildingPress]
  );

  const handleMapPress = useCallback(
    (event) => {
      if (Date.now() - featurePressAtRef.current < 500) return;
      const lngLat = event?.nativeEvent?.lngLat;
      if (!onMapPress || !Array.isArray(lngLat)) return;
      onMapPress({ latitude: lngLat[1], longitude: lngLat[0] });
    },
    [onMapPress]
  );

  const isSelectedExpr = ['==', ['get', 'id'], selectedId];

  return (
    <View style={[styles.container, style]}>
      <MapLibreMap
        style={StyleSheet.absoluteFill}
        mapStyle={styleUrl}
        onPress={handleMapPress}
        onDidFailLoadingMap={handleDidFailLoadingMap}
        dragPan={interactive}
        touchZoom={interactive}
        doubleTapZoom={interactive}
        touchRotate={interactive}
        touchPitch={interactive}
        compass={interactive}
        compassHiddenFacingNorth
        logo={false}
        attribution
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: [initialCenter.longitude, initialCenter.latitude],
            zoom: initialZoom,
          }}
          minZoom={SIGMA_MIN_ZOOM}
          maxZoom={SIGMA_MAX_ZOOM}
          maxBounds={CAMPUS_MAX_BOUNDS}
        />

        <GeoJSONSource id="campus-perimeter-source" data={campusBoundary || EMPTY_COLLECTION}>
          <Layer
            id="campus-perimeter-line"
            type="line"
            paint={{
              'line-color': colors.perimeter,
              'line-width': 2.5,
              'line-dasharray': [3, 2],
            }}
          />
        </GeoJSONSource>

        <GeoJSONSource id="campus-paths-source" data={paths || EMPTY_COLLECTION}>
          <Layer
            id="campus-paths-line"
            type="line"
            filter={['==', ['geometry-type'], 'LineString']}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{
              'line-color': colors.path,
              'line-width': 3.5,
              'line-opacity': 0.85,
            }}
          />
        </GeoJSONSource>

        <GeoJSONSource
          id="campus-buildings-source"
          data={buildings || EMPTY_COLLECTION}
          onPress={onBuildingPress ? handleBuildingSourcePress : undefined}
        >
          <Layer
            id="campus-buildings-fill"
            type="fill"
            paint={{
              'fill-color': ['case', isSelectedExpr, colors.secondary, colors.primary],
              'fill-opacity': ['case', isSelectedExpr, 0.5, 0.2],
            }}
          />
          <Layer
            id="campus-buildings-outline"
            type="line"
            paint={{
              'line-color': ['case', isSelectedExpr, colors.secondary, colors.primary],
              'line-width': ['case', isSelectedExpr, 3, 1.5],
            }}
          />
        </GeoJSONSource>

        <GeoJSONSource id="campus-entrances-source" data={entrances || EMPTY_COLLECTION}>
          <Layer
            id="campus-entrances-circle"
            type="circle"
            filter={['==', ['geometry-type'], 'Point']}
            paint={{
              'circle-radius': 4.5,
              'circle-color': colors.entrance,
              'circle-stroke-width': 1.5,
              'circle-stroke-color': '#ffffff',
            }}
          />
        </GeoJSONSource>

        <GeoJSONSource id="sigma-route" data={routeCollection}>
          <Layer
            id="sigma-route-aura"
            type="line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{
              'line-color': colors.secondary,
              'line-width': 11,
              'line-opacity': 0.2,
            }}
          />
          {/* Línea continua a propósito: en el emulador Android (render por software) las capas
              con line-dasharray no se dibujaban, y la ruta no puede depender de eso. */}
          <Layer
            id="sigma-route-line"
            type="line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{
              'line-color': colors.secondary,
              'line-width': 5.5,
            }}
          />
        </GeoJSONSource>

        {buildingMarkers.map((marker) => {
          const isSelected = marker.id === selectedId;
          return (
            <Marker
              key={`marker-${marker.id}`}
              id={`marker-${marker.id}`}
              lngLat={[marker.coordinates.longitude, marker.coordinates.latitude]}
              anchor="center"
              onPress={(event) => handleMarkerPress(event, marker)}
            >
              <View style={styles.markerContainer}>
                <View
                  style={[
                    styles.markerBadge,
                    {
                      backgroundColor: isSelected ? colors.secondary : colors.primary,
                      width: isSelected ? 34 : 26,
                      height: isSelected ? 34 : 26,
                      borderRadius: isSelected ? 17 : 13,
                    },
                  ]}
                >
                  <School size={isSelected ? 15 : 11} color="#ffffff" />
                </View>
                {isSelected && (
                  <View style={[styles.markerTitleContainer, { backgroundColor: colors.primary }]}>
                    <Text style={styles.markerTitleText} numberOfLines={1}>
                      {marker.name}
                    </Text>
                  </View>
                )}
              </View>
            </Marker>
          );
        })}

        {!isSimulatedUser && <NativeUserLocation />}

        {isSimulatedUser && userLocation && (
          <Marker
            id="simulated-user"
            lngLat={[userLocation.longitude, userLocation.latitude]}
            anchor="center"
          >
            <View style={styles.simulatedUserContainer}>
              <View style={[styles.simulatedUserPulse, { backgroundColor: colors.secondary }]} />
              <View style={[styles.simulatedUserDot, { backgroundColor: colors.secondary }]} />
            </View>
          </Marker>
        )}
      </MapLibreMap>
    </View>
  );
});

export default SigmaMapNative;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    maxWidth: 140,
  },
  markerBadge: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.2,
    borderColor: '#ffffff',
    elevation: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
  },
  markerTitleContainer: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    marginTop: 4,
    elevation: 3,
  },
  markerTitleText: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'Roboto-Bold',
  },
  simulatedUserContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  simulatedUserDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#ffffff',
    position: 'absolute',
    elevation: 4,
  },
  simulatedUserPulse: {
    width: 28,
    height: 28,
    borderRadius: 14,
    position: 'absolute',
    opacity: 0.3,
  },
});
