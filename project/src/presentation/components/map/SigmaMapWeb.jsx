import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet } from 'react-native';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getMapTilerApiKey } from '../../../core/config/mapConfig';
import { SIGMA_MAP_DEFAULT_PROPS } from './SigmaMapContract';
import { routeResultToGeoJSON } from '../../../core/utils/routeAdapters';

const CAMPUS_BOUNDS = [
  [-98.1255, 19.4045], // [minLng, minLat]
  [-98.1160, 19.4125], // [maxLng, maxLat]
];

/**
 * Componente SigmaMap para entorno Web implementado con MapLibre GL JS.
 */
export const SigmaMapWeb = forwardRef(function SigmaMapWeb(
  {
    initialCenter = SIGMA_MAP_DEFAULT_PROPS.initialCenter,
    initialZoom = SIGMA_MAP_DEFAULT_PROPS.initialZoom,
    buildings = null,
    paths = null,
    entrances = null,
    campusBoundary = null,
    selectedBuilding = null,
    onBuildingPress = null,
    onMapPress = null,
    interactive = true,
    routeResult = null,
    style,
  },
  ref
) {
  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const isLoadedRef = useRef(false);
  const routeResultRef = useRef(routeResult);
  // Los handlers de MapLibre se registran una sola vez; los refs evitan closures obsoletos.
  const onBuildingPressRef = useRef(onBuildingPress);
  const onMapPressRef = useRef(onMapPress);

  routeResultRef.current = routeResult;
  onBuildingPressRef.current = onBuildingPress;
  onMapPressRef.current = onMapPress;

  useImperativeHandle(ref, () => ({
    getMap: () => mapInstanceRef.current,
    flyTo: (options) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo(options);
      }
    },
  }));

  const ensureRouteLayer = (map, geoJsonFeature = null) => {
    if (!map) return;

    const featureCollection = geoJsonFeature
      ? { type: 'FeatureCollection', features: [geoJsonFeature] }
      : { type: 'FeatureCollection', features: [] };

    try {
      const source = map.getSource('sigma-route');
      if (!source) {
        map.addSource('sigma-route', {
          type: 'geojson',
          data: featureCollection,
        });
      } else {
        source.setData(featureCollection);
      }

      if (!map.getLayer('sigma-route-line')) {
        map.addLayer({
          id: 'sigma-route-line',
          type: 'line',
          source: 'sigma-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#0284c7',
            'line-width': 6,
            'line-opacity': 0.9,
          },
        });
      }
    } catch (e) {
      const message = typeof e === 'string' ? e : e?.message || '';
      const sanitized = message.replace(/key=[a-zA-Z0-9_-]+/g, 'key=REDACTED');
      console.warn('[SIGMA MapLibre] Error gestionando capa de ruta:', sanitized);
    }
  };

  const updateRouteData = (map, routeRes) => {
    if (!map || !isLoadedRef.current) return;

    if (!routeRes) {
      ensureRouteLayer(map, null);
      return;
    }

    try {
      const feature = routeResultToGeoJSON(routeRes);
      ensureRouteLayer(map, feature);
    } catch (err) {
      console.warn('[SIGMA MapLibre] Error procesando routeResult:', err.message);
      ensureRouteLayer(map, null);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    let apiKey = '';
    try {
      apiKey = getMapTilerApiKey();
    } catch (e) {
      console.error(e.message);
      return;
    }

    const styleUrl = `https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}`;

    if (typeof maplibregl.setWorkerUrl === 'function') {
      maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: [initialCenter.longitude, initialCenter.latitude],
      zoom: initialZoom,
      minZoom: 15,
      maxZoom: 20,
      maxBounds: CAMPUS_BOUNDS,
      interactive,
      attributionControl: true,
    });

    mapInstanceRef.current = map;

    if (interactive) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    }

    map.on('error', (e) => {
      if (e && e.error) {
        const message = typeof e.error === 'string' ? e.error : e.error.message || '';
        const sanitized = message.replace(/key=[a-zA-Z0-9_-]+/g, 'key=REDACTED');
        console.warn('[SIGMA MapLibre] Evento de error sanitizado:', sanitized);
      }
    });

    map.on('styledata', () => {
      const planetSource = map.getSource('maptiler_planet');
      if (planetSource && planetSource.maxzoom > 15) {
        planetSource.maxzoom = 15;
      }
      if (isLoadedRef.current) {
        updateRouteData(map, routeResultRef.current);
      }
    });

    map.on('load', () => {
      isLoadedRef.current = true;
      setupLayers(map);
      updateData(map);
      updateRouteData(map, routeResultRef.current);
    });

    map.on('click', (e) => {
      // Un clic sobre un edificio lo maneja el handler de la capa; no es un clic en "zona libre".
      if (map.getLayer('campus-buildings-fill')) {
        const hits = map.queryRenderedFeatures(e.point, { layers: ['campus-buildings-fill'] });
        if (hits.length > 0) return;
      }
      if (onMapPressRef.current) {
        onMapPressRef.current({
          latitude: e.lngLat.lat,
          longitude: e.lngLat.lng,
        });
      }
    });

    return () => {
      isLoadedRef.current = false;
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const setupLayers = (map) => {
    // 1. Fuente y Capa del Perímetro del Campus
    map.addSource('campus-perimeter-source', {
      type: 'geojson',
      data: campusBoundary || { type: 'FeatureCollection', features: [] },
    });

    map.addLayer({
      id: 'campus-perimeter-line',
      type: 'line',
      source: 'campus-perimeter-source',
      paint: {
        'line-color': '#0ea5e9',
        'line-width': 2.5,
        'line-dasharray': [3, 2],
      },
    });

    // 2. Fuente y Capa de Senderos/Caminos Peatonales
    map.addSource('campus-paths-source', {
      type: 'geojson',
      data: paths || { type: 'FeatureCollection', features: [] },
    });

    map.addLayer({
      id: 'campus-paths-line',
      type: 'line',
      source: 'campus-paths-source',
      filter: ['==', '$type', 'LineString'],
      paint: {
        'line-color': '#94a3b8',
        'line-width': 3.5,
        'line-opacity': 0.85,
      },
    });

    // 3. Fuente y Capas de Edificios (Relleno y Borde)
    map.addSource('campus-buildings-source', {
      type: 'geojson',
      data: buildings || { type: 'FeatureCollection', features: [] },
      generateId: true,
    });

    map.addLayer({
      id: 'campus-buildings-fill',
      type: 'fill',
      source: 'campus-buildings-source',
      paint: {
        'fill-color': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          '#0284c7',
          '#043c55',
        ],
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          0.5,
          0.2,
        ],
      },
    });

    map.addLayer({
      id: 'campus-buildings-outline',
      type: 'line',
      source: 'campus-buildings-source',
      paint: {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          '#0284c7',
          '#043c55',
        ],
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          3,
          1.5,
        ],
      },
    });

    // 4. Fuente y Capa de Entradas/Cruces
    map.addSource('campus-entrances-source', {
      type: 'geojson',
      data: entrances || { type: 'FeatureCollection', features: [] },
    });

    map.addLayer({
      id: 'campus-entrances-circle',
      type: 'circle',
      source: 'campus-entrances-source',
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-radius': 4.5,
        'circle-color': '#10b981',
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
      },
    });

    // 5. Inicialización de la Capa de Ruta Dinámica
    ensureRouteLayer(map, null);

    // Eventos de interacción sobre edificios
    map.on('click', 'campus-buildings-fill', (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        if (onBuildingPressRef.current) {
          onBuildingPressRef.current(feature);
        }
      }
    });

    map.on('mouseenter', 'campus-buildings-fill', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'campus-buildings-fill', () => {
      map.getCanvas().style.cursor = '';
    });
  };

  const updateData = (map) => {
    if (!map || !isLoadedRef.current) return;

    if (campusBoundary && map.getSource('campus-perimeter-source')) {
      map.getSource('campus-perimeter-source').setData(campusBoundary);
    }
    if (paths && map.getSource('campus-paths-source')) {
      map.getSource('campus-paths-source').setData(paths);
    }
    if (buildings && map.getSource('campus-buildings-source')) {
      map.getSource('campus-buildings-source').setData(buildings);
    }
    if (entrances && map.getSource('campus-entrances-source')) {
      map.getSource('campus-entrances-source').setData(entrances);
    }
  };

  // Actualizar datos si cambian las props después de la carga inicial
  useEffect(() => {
    if (mapInstanceRef.current && isLoadedRef.current) {
      updateData(mapInstanceRef.current);
    }
  }, [buildings, paths, entrances, campusBoundary]);

  // Actualizar renderizado de la ruta cuando cambie routeResult
  useEffect(() => {
    if (mapInstanceRef.current && isLoadedRef.current) {
      updateRouteData(mapInstanceRef.current, routeResult);
    }
  }, [routeResult]);

  // Actualizar estado de selección de edificio
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isLoadedRef.current || !buildings || !buildings.features) return;

    const selectedId = typeof selectedBuilding === 'string'
      ? selectedBuilding
      : selectedBuilding?.properties?.id || selectedBuilding?.id;

    buildings.features.forEach((feat, index) => {
      const featId = feat.properties?.id || feat.id;
      const isSelected = selectedId && featId === selectedId;
      try {
        map.setFeatureState(
          { source: 'campus-buildings-source', id: index },
          { selected: isSelected }
        );
      } catch (e) {
        // Ignorar si el featureState aún no está listo
      }
    });
  }, [selectedBuilding, buildings]);

  return (
    <View style={[styles.container, style]}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </View>
  );
});

export default SigmaMapWeb;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
});
