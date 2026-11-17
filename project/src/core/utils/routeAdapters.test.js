import { routeResultToGeoJSON } from './routeAdapters.js';

console.log('--- Probando routeAdapters.js (RouteResult -> GeoJSON) ---');

// Mock Data 1: Dijkstra RouteResult
const dijkstraResult = {
  coordinates: [
    { latitude: 19.4071, longitude: -98.1210 },
    { latitude: 19.4075, longitude: -98.1205 },
  ],
  distanceMeters: 180,
  durationSeconds: 150,
  provider: 'dijkstra',
  metadata: { nodePath: ['EP-003', 'EE-12'] },
};

// Mock Data 2: OSRM RouteResult
const osrmResult = {
  coordinates: [
    { latitude: 19.3900, longitude: -98.1100 },
    { latitude: 19.4071, longitude: -98.1210 },
  ],
  distanceMeters: 1000,
  durationSeconds: 200,
  provider: 'osrm',
  metadata: { profile: 'driving' },
};

// Mock Data 3: Hybrid RouteResult
const hybridResult = {
  coordinates: [
    { latitude: 19.3900, longitude: -98.1100 },
    { latitude: 19.4071, longitude: -98.1210 },
    { latitude: 19.4075, longitude: -98.1205 },
  ],
  distanceMeters: 1180,
  durationSeconds: 350,
  provider: 'hybrid',
  metadata: {
    isHybrid: true,
    segmentCount: 2,
    selectedEntryPoint: { id: 'EP-003', name: 'Entrada Principal' },
    selectedExitPoint: null,
    segments: [
      { provider: 'osrm', distanceMeters: 1000, durationSeconds: 200 },
      { provider: 'dijkstra', distanceMeters: 180, durationSeconds: 150 },
    ],
  },
};

// Test 1: Dijkstra -> GeoJSON LineString
const geoJsonDijkstra = routeResultToGeoJSON(dijkstraResult);
if (geoJsonDijkstra.type !== 'Feature' || geoJsonDijkstra.geometry.type !== 'LineString') {
  throw new Error('Falló estructura Feature/LineString para Dijkstra');
}

// Test 2: OSRM -> GeoJSON LineString
const geoJsonOsrm = routeResultToGeoJSON(osrmResult);
if (geoJsonOsrm.properties.provider !== 'osrm') {
  throw new Error('Falló conservación de provider osrm');
}

// Test 3: Hybrid -> GeoJSON LineString
const geoJsonHybrid = routeResultToGeoJSON(hybridResult);
if (geoJsonHybrid.properties.provider !== 'hybrid') {
  throw new Error('Falló conservación de provider hybrid');
}

// Test 4: Orden estricto GeoJSON [longitude, latitude]
const firstPosition = geoJsonHybrid.geometry.coordinates[0];
if (firstPosition[0] !== -98.1100 || firstPosition[1] !== 19.3900) {
  throw new Error(`Falló orden [longitude, latitude]. Se obtuvo: ${JSON.stringify(firstPosition)}`);
}

// Test 5, 6, 7: Conservación de provider, distanceMeters, durationSeconds
if (geoJsonHybrid.properties.distanceMeters !== 1180) throw new Error('Falló conservación de distanceMeters');
if (geoJsonHybrid.properties.durationSeconds !== 350) throw new Error('Falló conservación de durationSeconds');

// Test 8, 9, 10: Conservación de metadata.segments, selectedEntryPoint, selectedExitPoint
if (!Array.isArray(geoJsonHybrid.properties.segments) || geoJsonHybrid.properties.segments.length !== 2) {
  throw new Error('Falló conservación de metadata.segments');
}
if (!geoJsonHybrid.properties.selectedEntryPoint || geoJsonHybrid.properties.selectedEntryPoint.id !== 'EP-003') {
  throw new Error('Falló conservación de selectedEntryPoint');
}

// Test 11: Coordenadas inválidas
let invalidCoordError = false;
try {
  routeResultToGeoJSON({
    coordinates: [
      { latitude: 19.407, longitude: -98.121 },
      { latitude: NaN, longitude: -98.120 },
    ],
  });
} catch (e) {
  invalidCoordError = e.message.includes('Coordenada inválida');
}
if (!invalidCoordError) throw new Error('Falló detección de coordenada NaN');

// Test 12: Coordenadas insuficientes (< 2)
let insufficientCoordError = false;
try {
  routeResultToGeoJSON({
    coordinates: [{ latitude: 19.407, longitude: -98.121 }],
  });
} catch (e) {
  insufficientCoordError = e.message.includes('al menos 2 coordenadas');
}
if (!insufficientCoordError) throw new Error('Falló detección de coordenadas insuficientes');

// Test 13: RouteResult inválido
let invalidResultError = false;
try {
  routeResultToGeoJSON(null);
} catch (e) {
  invalidResultError = e.message.includes('objeto válido');
}
if (!invalidResultError) throw new Error('Falló detección de routeResult nulo');

// Test 14: Inmutabilidad de objetos originales
const originalMetadataStr = JSON.stringify(hybridResult.metadata);
geoJsonHybrid.properties.metadata.segments.push({ provider: 'fake' });
if (JSON.stringify(hybridResult.metadata) !== originalMetadataStr) {
  throw new Error('Falló prueba de inmutabilidad: el objeto original fue mutado!');
}

console.log('✅ Todos los 14 tests unitarios de routeAdapters.js pasaron exitosamente!');
