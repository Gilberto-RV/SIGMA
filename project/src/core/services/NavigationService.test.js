import { NavigationService } from './NavigationService.js';
import { projectPointOntoSegment, calculateRouteProgress } from '../utils/geoAdapters.js';

console.log('--- Probando NavigationService.js + Cálculo de Progreso (Etapa 4E.2) ---');

const mockRouteResult = {
  coordinates: [
    { latitude: 19.4070, longitude: -98.1210 }, // P0: Inicio (EP-003)
    { latitude: 19.4075, longitude: -98.1205 }, // P1: Intermedio (~70m)
    { latitude: 19.4080, longitude: -98.1200 }, // P2: Destino (~70m)
  ],
  distanceMeters: 140,
  durationSeconds: 90,
  provider: 'dijkstra',
};

const mockHybridRouteResult = {
  coordinates: [
    { latitude: 19.3900, longitude: -98.1100 }, // Ext0 (Fuera de campus)
    { latitude: 19.4071, longitude: -98.1210 }, // Acceso EP-003 (~1000m OSRM)
    { latitude: 19.4075, longitude: -98.1205 }, // Edificio (~70m Dijkstra)
  ],
  distanceMeters: 1070,
  durationSeconds: 250,
  provider: 'hybrid',
  metadata: {
    isHybrid: true,
    segments: [
      { provider: 'osrm', distanceMeters: 1000, durationSeconds: 200 },
      { provider: 'dijkstra', distanceMeters: 70, durationSeconds: 50 },
    ],
  },
};

const navService = new NavigationService({ arrivalToleranceMeters: 12, offRouteThresholdMeters: 25 });

// 1. Progreso en origen
navService.setRoute(mockRouteResult);
navService.startNavigation(null, { latitude: 19.4070, longitude: -98.1210 });
let state = navService.getState();
if (state.progress.progressPercent !== 0) {
  throw new Error(`Test 1 Falló: Progreso en origen debió ser 0%, obtenido: ${state.progress.progressPercent}`);
}
if (state.progress.currentSegmentIndex !== 0) throw new Error('Test 1 Falló: Índice de segmento debió ser 0');

// 2. Progreso aproximadamente al 50%
const midPoint = { latitude: 19.4075, longitude: -98.1205 };
state = navService.updateUserPosition(midPoint);
if (state.progress.progressPercent < 45 || state.progress.progressPercent > 55) {
  throw new Error(`Test 2 Falló: Progreso en punto medio debió ser ~50%, obtenido: ${state.progress.progressPercent}`);
}
if (state.progress.currentSegmentIndex !== 0 && state.progress.currentSegmentIndex !== 1) {
  throw new Error('Test 2 Falló: Índice de segmento fuera de rango');
}

// 3. Progreso en destino
const endPoint = { latitude: 19.4080, longitude: -98.1200 };
state = navService.updateUserPosition(endPoint);
if (state.status !== 'finished' || state.progress.progressPercent !== 100 || state.progress.remainingDistanceMeters !== 0) {
  throw new Error(`Test 3 Falló: Progreso en destino debió ser 100% y status finished. Estado: ${JSON.stringify(state)}`);
}

// 4. Detección fuera de ruta (>25m)
navService.startNavigation(mockRouteResult, { latitude: 19.4070, longitude: -98.1210 });
const offRoutePoint = { latitude: 19.4120, longitude: -98.1300 }; // ~600m lejos de la ruta
state = navService.updateUserPosition(offRoutePoint);
if (state.progress.isOffRoute !== true || state.progress.distanceToRouteMeters <= 25) {
  throw new Error(`Test 4 Falló: Detección fuera de ruta. Distancia: ${state.progress.distanceToRouteMeters}`);
}

// 5. Ruta híbrida y transición entre segmentos
navService.setRoute(mockHybridRouteResult);
navService.startNavigation();
// Posición en tramo OSRM
state = navService.updateUserPosition({ latitude: 19.3950, longitude: -98.1130 });
if (state.progress.activeProvider !== 'osrm') {
  throw new Error(`Test 5 Falló: Se esperaba activeProvider osrm y se obtuvo ${state.progress.activeProvider}`);
}
// Posición en tramo Dijkstra dentro del campus
state = navService.updateUserPosition({ latitude: 19.4073, longitude: -98.1207 });
if (state.progress.activeProvider !== 'dijkstra') {
  throw new Error(`Test 5 Falló: Se esperaba activeProvider dijkstra y se obtuvo ${state.progress.activeProvider}`);
}

// 6. Posición repetida/estática
const samePos = { latitude: 19.4073, longitude: -98.1207 };
const statePrev = navService.updateUserPosition(samePos);
const stateNext = navService.updateUserPosition(samePos);
if (statePrev.progress.progressPercent !== stateNext.progress.progressPercent) {
  throw new Error('Test 6 Falló: Posición estática causó fluctuaciones de progreso');
}

// 7. Ruta de dos puntos
const twoPointRoute = {
  coordinates: [
    { latitude: 19.4070, longitude: -98.1210 },
    { latitude: 19.4071, longitude: -98.1211 },
  ],
  distanceMeters: 20,
  durationSeconds: 10,
  provider: 'dijkstra',
};
navService.setRoute(twoPointRoute);
state = navService.startNavigation(null, { latitude: 19.40705, longitude: -98.12105 });
if (state.progress.currentSegmentIndex !== 0) throw new Error('Test 7 Falló: Ruta de 2 puntos');

// 8. Coordenadas duplicadas / segmentos de longitud 0
const duplicateCoordsRoute = {
  coordinates: [
    { latitude: 19.4070, longitude: -98.1210 },
    { latitude: 19.4070, longitude: -98.1210 }, // Duplicado
    { latitude: 19.4075, longitude: -98.1205 },
  ],
  distanceMeters: 70,
  durationSeconds: 40,
  provider: 'dijkstra',
};
navService.setRoute(duplicateCoordsRoute);
state = navService.startNavigation(null, { latitude: 19.4070, longitude: -98.1210 });
if (Number.isNaN(state.progress.progressPercent) || Number.isNaN(state.progress.remainingDistanceMeters)) {
  throw new Error('Test 8 Falló: Coordenadas duplicadas causaron NaN');
}

// 9. Segmento degenerado A === B
const projDegenerate = projectPointOntoSegment(
  { latitude: 19.4070, longitude: -98.1210 },
  { latitude: 19.4070, longitude: -98.1210 },
  { latitude: 19.4070, longitude: -98.1210 }
);
if (projDegenerate.t !== 0 || Number.isNaN(projDegenerate.distanceMeters)) {
  throw new Error('Test 9 Falló: Manejo de segmento degenerado');
}

// 10. Inmutabilidad de RouteResult
const origCoordsStr = JSON.stringify(mockRouteResult.coordinates);
navService.setRoute(mockRouteResult);
navService.updateUserPosition({ latitude: 19.4075, longitude: -98.1205 });
if (JSON.stringify(mockRouteResult.coordinates) !== origCoordsStr) {
  throw new Error('Test 10 Falló: RouteResult original fue mutado!');
}

// 11. Límites de progressPercent (0 <= P <= 100)
if (state.progress.progressPercent < 0 || state.progress.progressPercent > 100) {
  throw new Error(`Test 11 Falló: progressPercent fuera de límites [0, 100]: ${state.progress.progressPercent}`);
}

// 12. distanceRemainingMeters nunca negativa
if (state.progress.remainingDistanceMeters < 0) {
  throw new Error(`Test 12 Falló: remainingDistanceMeters es negativa: ${state.progress.remainingDistanceMeters}`);
}

// 13. Recuperación con jitter GPS cercano al segmento anterior
navService.setRoute(mockRouteResult);
navService.startNavigation(null, { latitude: 19.4070, longitude: -98.1210 });
navService.updateUserPosition({ latitude: 19.4074, longitude: -98.1206 }); // Avance a seg 0
state = navService.updateUserPosition({ latitude: 19.40739, longitude: -98.12061 }); // Pequeño jitter
if (state.progress.currentSegmentIndex > 1) {
  throw new Error('Test 13 Falló: Jitter causó salto desmedido');
}

// 14. Determinación del segmento activo
if (typeof state.progress.currentSegmentIndex !== 'number' || state.progress.currentSegmentIndex < 0) {
  throw new Error('Test 14 Falló: Determinación de currentSegmentIndex');
}

console.log('✅ Todos los 14 tests unitarios de NavigationService + Progreso pasaron exitosamente!');
