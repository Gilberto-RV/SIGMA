import { OsrmClient } from '../../infrastructure/http/OsrmClient.js';
import { RoutingService, concatenateCoordinates, buildDirectSegment } from './RoutingService.js';
import { DijkstraRoutingService } from './DijkstraRoutingService.js';
import { CampusAccessService } from './CampusAccessService.js';
import { OSRM_BASE_URL } from '../config/mapConfig.js';
import { campusAccessServiceOptions } from './campusGeoFixtures.node.js';

console.log('--- Probando RoutingService + CampusAccessService ---');

// Mocks para pruebas aisladas
const mockOsrmClient = {
  async route(coordinates, options) {
    if (!coordinates || coordinates.length < 2) throw new Error('Coordenadas insuficientes OSRM');
    const start = coordinates[0];
    const end = coordinates[1];
    return {
      code: 'Ok',
      distance: 1000,
      duration: 200,
      geometry: {
        type: 'LineString',
        coordinates: [
          [start.longitude, start.latitude],
          [end.longitude, end.latitude],
        ],
      },
    };
  },
};

const mockDijkstraService = {
  async calculateRoute(origin, destination, options) {
    const originCoord = typeof origin === 'object' ? origin : { latitude: 19.4071, longitude: -98.1210 };
    const destCoord = typeof destination === 'object' ? destination : { latitude: 19.4075, longitude: -98.1205 };
    return {
      coordinates: [originCoord, destCoord],
      distanceMeters: 300,
      durationSeconds: 150,
      provider: 'dijkstra',
      metadata: { nodePath: ['AP-004', 'EE-12'] },
    };
  },
};

const campusAccessService = new CampusAccessService(campusAccessServiceOptions);

const service = new RoutingService({
  osrmClient: mockOsrmClient,
  dijkstraRoutingService: mockDijkstraService,
  campusAccessService: campusAccessService,
});

const extOrigin = { latitude: 19.3900, longitude: -98.1100 }; // Punto fuera del campus al oriente
const intDest = 'EE-12'; // Destino dentro del campus
const intOrigin = { latitude: 19.4075, longitude: -98.1200 }; // Punto dentro del campus
const extDest = { latitude: 19.4200, longitude: -98.1300 }; // Punto fuera del campus al poniente

// 1. Autoselección Externo -> Interno
const autoHybridEntry = await service.calculateHybridRoute(extOrigin, intDest);
if (autoHybridEntry.provider !== 'hybrid') throw new Error('Falló autoselección Externo -> Interno provider');
if (!autoHybridEntry.metadata.selectedEntryPoint || autoHybridEntry.metadata.selectedEntryPoint.type !== 'CAMPUS_ENTRANCE') {
  throw new Error('Falló autoselección de selectedEntryPoint');
}
if (autoHybridEntry.metadata.selectedEntryPoint.id !== 'AP-004') {
  throw new Error(`Se esperaba AP-004 como acceso más cercano y se obtuvo ${autoHybridEntry.metadata.selectedEntryPoint.id}`);
}

// 2. Autoselección Interno -> Externo
const autoHybridExit = await service.calculateHybridRoute(intOrigin, extDest);
if (autoHybridExit.provider !== 'hybrid') throw new Error('Falló autoselección Interno -> Externo provider');
if (!autoHybridExit.metadata.selectedExitPoint || autoHybridExit.metadata.selectedExitPoint.type !== 'CAMPUS_ENTRANCE') {
  throw new Error('Falló autoselección de selectedExitPoint');
}

// 3. Autodetección Interno -> Interno
const autoCampusRoute = await service.calculateHybridRoute(intOrigin, intDest);
if (autoCampusRoute.provider !== 'dijkstra') throw new Error('Falló autodetección Interno -> Interno');

// 4. Autodetección Externo -> Externo
const autoExternalRoute = await service.calculateHybridRoute(extOrigin, extDest);
if (autoExternalRoute.provider !== 'osrm') throw new Error('Falló autodetección Externo -> Externo');

// 5. OSRM caído: tramo directo de respaldo + Dijkstra, con aviso en metadata
const failingOsrm = { async route() { throw new Error('[OsrmClient] Error de red simulado'); } };
const offlineService = new RoutingService({
  osrmClient: failingOsrm,
  dijkstraRoutingService: mockDijkstraService,
  campusAccessService,
});
const fallbackRoute = await offlineService.calculateHybridRoute(extOrigin, intDest);
if (fallbackRoute.provider !== 'hybrid') throw new Error('El respaldo debe seguir siendo una ruta híbrida');
if (fallbackRoute.metadata.segments[0].provider !== 'direct') throw new Error('El primer tramo debe ser directo cuando OSRM falla');
if (!fallbackRoute.metadata.warnings.includes('external_route_unavailable')) throw new Error('Falta el aviso external_route_unavailable');
if (fallbackRoute.metadata.segments[1].provider !== 'dijkstra') throw new Error('El tramo del campus debe seguir siendo Dijkstra');

// 6. Sin respaldo permitido, el error se propaga
let propagated = false;
try {
  await offlineService.calculateHybridRoute(extOrigin, intDest, { allowDirectFallback: false });
} catch (e) {
  propagated = e.code === 'ROUTING_SEGMENT_FAILED';
}
if (!propagated) throw new Error('Con allowDirectFallback=false el fallo de OSRM debe propagarse');

// 7. buildDirectSegment: distancia y tiempo a pie coherentes; null si un extremo no es coordenada
const direct = buildDirectSegment({ latitude: 19.4, longitude: -98.12 }, { latitude: 19.401, longitude: -98.12 });
if (Math.abs(direct.distanceMeters - 111) > 2) throw new Error(`Distancia directa inesperada: ${direct.distanceMeters}`);
if (Math.abs(direct.durationSeconds - direct.distanceMeters / 1.3) > 1) throw new Error('Duración a pie inesperada');
if (buildDirectSegment('EP-003', { latitude: 19.4, longitude: -98.12 }) !== null) throw new Error('Debe devolver null con extremos no coordenados');

console.log('✅ Todos los tests unitarios de autoselección de accesos en RoutingService pasaron exitosamente!');
