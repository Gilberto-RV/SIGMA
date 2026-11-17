import { isValidCoordinate, coordinatesToGeoJSON } from './geoAdapters.js';

/**
 * Convierte un objeto RouteResult del sistema de routing de SIGMA en un Feature GeoJSON de tipo LineString
 * compatible con MapLibre GL JS y MapLibre React Native.
 *
 * @param {import('../services/RoutingService.js').RouteResult} routeResult Objeto resultado de la ruta.
 * @param {Object} [customProperties={}] Propiedades adicionales para inyectar en el GeoJSON Feature.
 * @returns {Object} GeoJSON Feature (LineString).
 * @throws {Error} Si el routeResult o sus coordenadas son inválidos.
 */
export function routeResultToGeoJSON(routeResult, customProperties = {}) {
  if (!routeResult || typeof routeResult !== 'object') {
    throw new Error('[routeAdapters] El argumento routeResult debe ser un objeto válido.');
  }

  if (!Array.isArray(routeResult.coordinates) || routeResult.coordinates.length < 2) {
    throw new Error('[routeAdapters] Se requieren al menos 2 coordenadas en routeResult para generar un GeoJSON LineString.');
  }

  // Validar minuciosamente cada coordenada para evitar lat/lng nulos, NaN o pasados como string
  for (let i = 0; i < routeResult.coordinates.length; i++) {
    const c = routeResult.coordinates[i];
    if (!isValidCoordinate(c)) {
      throw new Error(`[routeAdapters] Coordenada inválida en el índice ${i}: ${JSON.stringify(c)}`);
    }
  }

  // Convertir [{ latitude, longitude }] a [[longitude, latitude]] respetando la especificación GeoJSON
  const geoJsonPositions = coordinatesToGeoJSON(routeResult.coordinates);

  // Deep clone inmutable de los metadatos para evitar la mutación de objetos originales
  const rawMetadata = routeResult.metadata ? JSON.parse(JSON.stringify(routeResult.metadata)) : {};

  const featureProperties = {
    provider: routeResult.provider || 'unknown',
    distanceMeters: typeof routeResult.distanceMeters === 'number' ? routeResult.distanceMeters : 0,
    durationSeconds: typeof routeResult.durationSeconds === 'number' ? routeResult.durationSeconds : 0,
    isHybrid: Boolean(rawMetadata.isHybrid || routeResult.provider === 'hybrid'),
    segments: rawMetadata.segments || null,
    selectedEntryPoint: rawMetadata.selectedEntryPoint || null,
    selectedExitPoint: rawMetadata.selectedExitPoint || null,
    metadata: rawMetadata,
    ...customProperties,
  };

  return {
    type: 'Feature',
    properties: featureProperties,
    geometry: {
      type: 'LineString',
      coordinates: geoJsonPositions,
    },
  };
}

export default routeResultToGeoJSON;
