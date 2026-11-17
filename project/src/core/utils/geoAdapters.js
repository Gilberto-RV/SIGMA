// src/core/utils/geoAdapters.js

/**
 * Utilidades puras y reutilizables para transformar y validar coordenadas
 * entre la convención React Native / SIGMA { latitude, longitude }
 * y la convención estándar GeoJSON [longitude, latitude].
 */

/**
 * Valida si un objeto posee propiedades de latitud y longitud numéricas válidas.
 * @param {any} coord 
 * @returns {boolean}
 */
export const isValidCoordinate = (coord) => {
  if (!coord || typeof coord !== 'object') return false;
  const { latitude, longitude } = coord;
  return (
    typeof latitude === 'number' &&
    !Number.isNaN(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === 'number' &&
    !Number.isNaN(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
};

/**
 * Valida si una tupla GeoJSON es válida [longitude, latitude].
 * @param {any} position 
 * @returns {boolean}
 */
export const isValidGeoJSONPosition = (position) => {
  if (!Array.isArray(position) || position.length < 2) return false;
  const [longitude, latitude] = position;
  return (
    typeof longitude === 'number' &&
    !Number.isNaN(longitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    typeof latitude === 'number' &&
    !Number.isNaN(latitude) &&
    latitude >= -90 &&
    latitude <= 90
  );
};

/**
 * Convierte una coordenada { latitude, longitude } en una posición GeoJSON [longitude, latitude].
 * @param {{ latitude: number, longitude: number }} coord
 * @returns {[number, number]}
 */
export const coordinateToGeoJSON = (coord) => {
  if (!isValidCoordinate(coord)) {
    throw new Error(`[geoAdapters] Coordenada inválida proporcionada a coordinateToGeoJSON: ${JSON.stringify(coord)}`);
  }
  return [coord.longitude, coord.latitude];
};

/**
 * Convierte una posición GeoJSON [longitude, latitude] en un objeto { latitude, longitude }.
 * @param {[number, number]} position
 * @returns {{ latitude: number, longitude: number }}
 */
export const geoJSONToCoordinate = (position) => {
  if (!isValidGeoJSONPosition(position)) {
    throw new Error(`[geoAdapters] Posición GeoJSON inválida proporcionada a geoJSONToCoordinate: ${JSON.stringify(position)}`);
  }
  return {
    latitude: position[1],
    longitude: position[0],
  };
};

/**
 * Convierte un arreglo de coordenadas [{ latitude, longitude }] a un arreglo GeoJSON [[lng, lat]].
 * @param {Array<{ latitude: number, longitude: number }>} coords
 * @returns {Array<[number, number]>}
 */
export const coordinatesToGeoJSON = (coords) => {
  if (!Array.isArray(coords)) return [];
  return coords.filter(isValidCoordinate).map(c => [c.longitude, c.latitude]);
};

/**
 * Convierte un arreglo GeoJSON [[lng, lat]] a un arreglo de coordenadas [{ latitude, longitude }].
 * @param {Array<[number, number]>} positions
 * @returns {Array<{ latitude: number, longitude: number }>}
 */
export const geoJSONToCoordinates = (positions) => {
  if (!Array.isArray(positions)) return [];
  return positions.filter(isValidGeoJSONPosition).map(p => ({
    latitude: p[1],
    longitude: p[0],
  }));
};

/**
 * Genera un Feature GeoJSON de tipo Point a partir de una coordenada o posición.
 * @param {{ latitude: number, longitude: number } | [number, number]} coordOrPosition
 * @param {object} properties
 * @param {string|number|null} id
 * @returns {object} GeoJSON Feature (Point)
 */
export const featureToPoint = (coordOrPosition, properties = {}, id = null) => {
  let coordinates;
  if (Array.isArray(coordOrPosition)) {
    if (!isValidGeoJSONPosition(coordOrPosition)) {
      throw new Error(`[geoAdapters] Posición GeoJSON inválida para featureToPoint`);
    }
    coordinates = [coordOrPosition[0], coordOrPosition[1]];
  } else if (isValidCoordinate(coordOrPosition)) {
    coordinates = [coordOrPosition.longitude, coordOrPosition.latitude];
  } else {
    throw new Error(`[geoAdapters] Entrada inválida para featureToPoint`);
  }

  const feature = {
    type: 'Feature',
    properties: { ...properties },
    geometry: {
      type: 'Point',
      coordinates,
    },
  };

  if (id !== null && id !== undefined) {
    feature.id = id;
  }

  return feature;
};

/**
 * Genera un Feature GeoJSON de tipo LineString a partir de un arreglo de coordenadas o posiciones.
 * @param {Array<{ latitude: number, longitude: number } | [number, number]>} points
 * @param {object} properties
 * @param {string|number|null} id
 * @returns {object} GeoJSON Feature (LineString)
 */
export const featureToLineString = (points, properties = {}, id = null) => {
  if (!Array.isArray(points) || points.length < 2) {
    throw new Error(`[geoAdapters] Se requieren al menos 2 puntos para crear un LineString`);
  }

  const coordinates = points.map(p => {
    if (Array.isArray(p) && isValidGeoJSONPosition(p)) {
      return [p[0], p[1]];
    }
    if (isValidCoordinate(p)) {
      return [p.longitude, p.latitude];
    }
    throw new Error(`[geoAdapters] Punto inválido encontrado al construir LineString: ${JSON.stringify(p)}`);
  });

  const feature = {
    type: 'Feature',
    properties: { ...properties },
    geometry: {
      type: 'LineString',
      coordinates,
    },
  };

  if (id !== null && id !== undefined) {
    feature.id = id;
  }

  return feature;
};

/**
 * Genera un Feature GeoJSON de tipo Polygon a partir de un anillo de coordenadas o posiciones.
 * Se asegura de que el polígono esté cerrado (primer punto = último punto).
 * @param {Array<{ latitude: number, longitude: number } | [number, number]>} ring
 * @param {object} properties
 * @param {string|number|null} id
 * @returns {object} GeoJSON Feature (Polygon)
 */
export const featureToPolygon = (ring, properties = {}, id = null) => {
  if (!Array.isArray(ring) || ring.length < 3) {
    throw new Error(`[geoAdapters] Se requieren al menos 3 puntos para definir el perímetro de un Polygon`);
  }

  const coordinates = ring.map(p => {
    if (Array.isArray(p) && isValidGeoJSONPosition(p)) {
      return [p[0], p[1]];
    }
    if (isValidCoordinate(p)) {
      return [p.longitude, p.latitude];
    }
    throw new Error(`[geoAdapters] Punto inválido encontrado al construir Polygon: ${JSON.stringify(p)}`);
  });

  // Asegurar cierre del anillo poligonal
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    coordinates.push([first[0], first[1]]);
  }

  const feature = {
    type: 'Feature',
    properties: { ...properties },
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
  };

  if (id !== null && id !== undefined) {
    feature.id = id;
  }

  return feature;
};

/**
 * Calcula la distancia haversine aproximada en metros entre dos coordenadas { latitude, longitude }.
 * @param {{ latitude: number, longitude: number }} c1
 * @param {{ latitude: number, longitude: number }} c2
 * @returns {number} Distancia en metros.
 */
export const calculateHaversineDistance = (c1, c2) => {
  if (!isValidCoordinate(c1) || !isValidCoordinate(c2)) return Infinity;
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (c2.latitude - c1.latitude) * rad;
  const dLon = (c2.longitude - c1.longitude) * rad;
  const lat1 = c1.latitude * rad;
  const lat2 = c2.latitude * rad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Determina si una coordenada { latitude, longitude } está dentro de un anillo de coordenadas [[lng, lat]].
 * @param {{ latitude: number, longitude: number }} point
 * @param {Array<[number, number]>} polygon Ring de posiciones GeoJSON.
 * @returns {boolean}
 */
export const isPointInPolygon = (point, polygon) => {
  if (!isValidCoordinate(point) || !Array.isArray(polygon) || polygon.length === 0) return false;
  const x = point.longitude;
  const y = point.latitude;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

/**
 * Proyecta ortogonalmente un punto sobre un segmento de recta definido por dos vértices.
 * Maneja segmentos degenerados donde A === B o la distancia es cero.
 *
 * @param {{ latitude: number, longitude: number }} point
 * @param {{ latitude: number, longitude: number }} segmentStart
 * @param {{ latitude: number, longitude: number }} segmentEnd
 * @returns {{ point: { latitude: number, longitude: number }, t: number, distanceMeters: number }}
 */
export const projectPointOntoSegment = (point, segmentStart, segmentEnd) => {
  if (!isValidCoordinate(point) || !isValidCoordinate(segmentStart) || !isValidCoordinate(segmentEnd)) {
    throw new Error('[geoAdapters] Coordenadas inválidas en projectPointOntoSegment.');
  }

  const dx = segmentEnd.longitude - segmentStart.longitude;
  const dy = segmentEnd.latitude - segmentStart.latitude;
  const segLenSq = dx * dx + dy * dy;

  // Segmento degenerado (longitud virtual 0)
  if (segLenSq < 1e-12) {
    const dist = calculateHaversineDistance(point, segmentStart);
    return {
      point: { latitude: segmentStart.latitude, longitude: segmentStart.longitude },
      t: 0,
      distanceMeters: dist,
    };
  }

  const dxP = point.longitude - segmentStart.longitude;
  const dyP = point.latitude - segmentStart.latitude;

  let t = (dxP * dx + dyP * dy) / segLenSq;
  t = Math.max(0, Math.min(1, t));

  const projLat = segmentStart.latitude + t * dy;
  const projLng = segmentStart.longitude + t * dx;
  const projPoint = { latitude: projLat, longitude: projLng };

  const distanceMeters = calculateHaversineDistance(point, projPoint);

  return {
    point: projPoint,
    t,
    distanceMeters,
  };
};

/**
 * Calcula el progreso numérico y geométrico de una posición GPS sobre una polilínea de ruta.
 *
 * @param {{ latitude: number, longitude: number }} userLocation
 * @param {Array<{ latitude: number, longitude: number }>} routeCoordinates
 * @param {Object} [options]
 * @param {number} [options.offRouteThresholdMeters=25] Umbral en metros para considerar fuera de ruta.
 * @param {number|null} [options.lastSegmentIndex=null] Índice del último segmento activo para acelerar la búsqueda local.
 * @param {Array<number>|null} [options.cumulativeDistances=null] Arreglo precalculado de distancias acumuladas.
 * @param {Array<number>|null} [options.segmentDistances=null] Arreglo precalculado de distancias por segmento.
 * @returns {{
 *   totalDistanceMeters: number,
 *   traversedDistanceMeters: number,
 *   remainingDistanceMeters: number,
 *   progressPercent: number,
 *   currentSegmentIndex: number,
 *   distanceToRouteMeters: number,
 *   isOffRoute: boolean,
 *   projectedPoint: { latitude: number, longitude: number }
 * }}
 */
export const calculateRouteProgress = (userLocation, routeCoordinates, options = {}) => {
  const {
    offRouteThresholdMeters = 25,
    lastSegmentIndex = null,
    cumulativeDistances: inputCumulative = null,
    segmentDistances: inputSegments = null,
  } = options;

  if (!isValidCoordinate(userLocation)) {
    throw new Error('[geoAdapters] userLocation inválido en calculateRouteProgress.');
  }

  if (!Array.isArray(routeCoordinates) || routeCoordinates.length < 2) {
    throw new Error('[geoAdapters] routeCoordinates debe contener al menos 2 coordenadas.');
  }

  const numVertices = routeCoordinates.length;
  const numSegments = numVertices - 1;

  let segmentDistances = inputSegments;
  let cumulativeDistances = inputCumulative;

  if (!segmentDistances || !cumulativeDistances) {
    segmentDistances = [];
    cumulativeDistances = [0];
    for (let i = 0; i < numSegments; i++) {
      const d = calculateHaversineDistance(routeCoordinates[i], routeCoordinates[i + 1]);
      segmentDistances.push(d);
      cumulativeDistances.push(cumulativeDistances[i] + d);
    }
  }

  const totalDistanceMeters = cumulativeDistances[numVertices - 1];

  // Búsqueda de segmento óptimo
  let candidateIndices = [];
  if (
    typeof lastSegmentIndex === 'number' &&
    lastSegmentIndex >= 0 &&
    lastSegmentIndex < numSegments
  ) {
    const minIdx = Math.max(0, lastSegmentIndex - 1);
    const maxIdx = Math.min(numSegments - 1, lastSegmentIndex + 3);
    for (let i = minIdx; i <= maxIdx; i++) {
      candidateIndices.push(i);
    }
  } else {
    for (let i = 0; i < numSegments; i++) {
      candidateIndices.push(i);
    }
  }

  let bestSegmentIndex = candidateIndices[0];
  let bestProjection = projectPointOntoSegment(
    userLocation,
    routeCoordinates[bestSegmentIndex],
    routeCoordinates[bestSegmentIndex + 1]
  );

  for (let k = 1; k < candidateIndices.length; k++) {
    const idx = candidateIndices[k];
    const proj = projectPointOntoSegment(
      userLocation,
      routeCoordinates[idx],
      routeCoordinates[idx + 1]
    );
    if (proj.distanceMeters < bestProjection.distanceMeters) {
      bestProjection = proj;
      bestSegmentIndex = idx;
    }
  }

  // Fallback a escaneo global si la distancia proyectada local excede el umbral fuera de ruta
  if (
    bestProjection.distanceMeters > offRouteThresholdMeters &&
    candidateIndices.length < numSegments
  ) {
    for (let i = 0; i < numSegments; i++) {
      const proj = projectPointOntoSegment(
        userLocation,
        routeCoordinates[i],
        routeCoordinates[i + 1]
      );
      if (proj.distanceMeters < bestProjection.distanceMeters) {
        bestProjection = proj;
        bestSegmentIndex = i;
      }
    }
  }

  const segLength = segmentDistances[bestSegmentIndex] || 0;
  const traversedInSeg = bestProjection.t * segLength;
  const rawTraversed = cumulativeDistances[bestSegmentIndex] + traversedInSeg;
  const traversedDistanceMeters = Math.min(totalDistanceMeters, Math.max(0, rawTraversed));
  const remainingDistanceMeters = Math.max(0, totalDistanceMeters - traversedDistanceMeters);

  let rawPercent = 0;
  if (totalDistanceMeters > 0) {
    rawPercent = (traversedDistanceMeters / totalDistanceMeters) * 100;
  }
  const progressPercent = Math.min(100, Math.max(0, Number(rawPercent.toFixed(2))));

  const distanceToRouteMeters = Math.round(bestProjection.distanceMeters);
  const isOffRoute = distanceToRouteMeters > offRouteThresholdMeters;

  return Object.freeze({
    totalDistanceMeters: Math.round(totalDistanceMeters),
    traversedDistanceMeters: Math.round(traversedDistanceMeters),
    remainingDistanceMeters: Math.round(remainingDistanceMeters),
    progressPercent,
    currentSegmentIndex: bestSegmentIndex,
    distanceToRouteMeters,
    isOffRoute,
    projectedPoint: bestProjection.point,
  });
};


