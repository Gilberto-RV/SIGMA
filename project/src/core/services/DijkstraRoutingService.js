import { buildGraph, findNearestNode, findRoute } from '../utils/graphUtils.js';
import { accessibleEdgeCost, edgeKey, summarizePathAccessibility } from '../utils/accessibility.js';
import { isValidCoordinate } from '../utils/geoAdapters.js';

// Los GeoJSON del campus se inyectan desde fuera (ServiceContainer en la app, fixtures en las
// pruebas). Este módulo no debe importar APIs de Node como `module`/`createRequire`: Metro no
// puede resolverlas y rompen el bundle de Android.

/**
 * Calcula la distancia haversine aproximada en metros entre dos coordenadas.
 * @param {{ latitude: number, longitude: number }} c1
 * @param {{ latitude: number, longitude: number }} c2
 * @returns {number} Distancia en metros.
 */
export function calculateHaversineDistance(c1, c2) {
  if (!c1 || !c2) return 0;
  const R = 6371000; // Radio de la Tierra en metros
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
}

/**
 * Adaptador que envuelve el algoritmo de búsqueda de caminos Dijkstra interno (graphUtils.js)
 * y normaliza el resultado al contrato unificado RouteResult de SIGMA.
 */
export class DijkstraRoutingService {
  /**
   * @param {Object} [dependencies]
   * @param {Object} [dependencies.graph] Grafo de adyacencia previamente construido.
   * @param {Object} [dependencies.nodeCoords] Diccionario de coordenadas por ID de nodo.
   * @param {Array<Object>} [dependencies.geoJsonFeatures] Arreglo de features GeoJSON para construir el grafo si no se provee.
   */
  constructor({ graph = null, nodeCoords = null, edgeAttributes = {}, geoJsonFeatures = null } = {}) {
    if (graph && nodeCoords) {
      this.graph = graph;
      this.nodeCoords = nodeCoords;
      this.edgeAttributes = edgeAttributes;
    } else {
      const features = geoJsonFeatures || [];
      if (features.length === 0) {
        console.warn('[DijkstraRoutingService] Sin datos de caminos: inyecta geoJsonFeatures (Entradas + caminos).');
      }
      const built = buildGraph(features);
      this.graph = built.graph;
      this.nodeCoords = built.nodeCoords;
      this.edgeAttributes = built.edgeAttributes;
    }
  }

  /**
   * Calcula una ruta dentro de la red peatonal del campus utilizando Dijkstra.
   *
   * @param {{ latitude: number, longitude: number } | string} origin Coordenada o ID del nodo de origen.
   * @param {{ latitude: number, longitude: number } | string} destination Coordenada o ID del nodo de destino.
   * @param {Object} [options]
   * @param {number} [options.walkingSpeedMs=1.2] Velocidad promedio de caminata en m/s.
   * @param {boolean} [options.accessible=false] Ruta accesible: evita escaleras y pendientes fuertes registradas.
   * @returns {Promise<import('./RoutingService.js').RouteResult>} Ruta normalizada al contrato RouteResult.
   * @throws {Error} Si no se puede resolver la ruta o los nodos no son válidos.
   */
  async calculateRoute(origin, destination, options = {}) {
    if (!origin || !destination) {
      throw new Error('[DijkstraRoutingService] Origen y destino son requeridos.');
    }

    let startNodeId = null;
    let customStartCoord = null;

    if (typeof origin === 'string') {
      startNodeId = origin;
    } else if (isValidCoordinate(origin)) {
      customStartCoord = origin;
      startNodeId = findNearestNode(origin, this.nodeCoords, this.graph);
    } else {
      throw new Error(`[DijkstraRoutingService] Origen inválido: ${JSON.stringify(origin)}`);
    }

    let goalNodeId = null;
    if (typeof destination === 'string') {
      goalNodeId = destination;
    } else if (isValidCoordinate(destination)) {
      goalNodeId = findNearestNode(destination, this.nodeCoords, this.graph);
    } else {
      throw new Error(`[DijkstraRoutingService] Destino inválido: ${JSON.stringify(destination)}`);
    }

    if (!startNodeId || !this.graph[startNodeId]) {
      throw new Error(`[DijkstraRoutingService] Nodo de origen no encontrado en el grafo de caminos (${startNodeId}).`);
    }

    if (!goalNodeId || !this.graph[goalNodeId]) {
      throw new Error(`[DijkstraRoutingService] Nodo de destino no encontrado en el grafo de caminos (${goalNodeId}).`);
    }

    const accessible = options.accessible === true;
    const edgeCost = accessible
      ? (from, to, base) => accessibleEdgeCost(this.edgeAttributes[edgeKey(from, to)], base)
      : undefined;
    const pathNodeIds = findRoute(this.graph, startNodeId, goalNodeId, this.nodeCoords, { edgeCost });

    if (!pathNodeIds || pathNodeIds.length === 0) {
      if (accessible && findRoute(this.graph, startNodeId, goalNodeId, this.nodeCoords)) {
        const error = new Error('[DijkstraRoutingService] No hay una ruta accesible: todos los caminos tienen escaleras o pendientes fuertes.');
        error.code = 'NO_ACCESSIBLE_ROUTE';
        throw error;
      }
      throw new Error(`[DijkstraRoutingService] No se encontró una ruta navegable entre ${startNodeId} y ${goalNodeId}.`);
    }

    const pathCoords = pathNodeIds
      .map(id => this.nodeCoords[id])
      .filter(isValidCoordinate);

    // Si el usuario parte desde una coordenada GPS exacta no mapeada exactamente al nodo, la incluimos al inicio
    const finalCoordinates = customStartCoord ? [customStartCoord, ...pathCoords] : pathCoords;

    // Calcular distancia acumulada en metros
    let totalDistanceMeters = 0;
    for (let i = 0; i < finalCoordinates.length - 1; i++) {
      totalDistanceMeters += calculateHaversineDistance(finalCoordinates[i], finalCoordinates[i + 1]);
    }

    const walkingSpeedMs = typeof options.walkingSpeedMs === 'number' && options.walkingSpeedMs > 0
      ? options.walkingSpeedMs
      : 1.2;

    const durationSeconds = totalDistanceMeters / walkingSpeedMs;

    return {
      coordinates: finalCoordinates,
      distanceMeters: Math.round(totalDistanceMeters),
      durationSeconds: Math.round(durationSeconds),
      provider: 'dijkstra',
      metadata: {
        nodePath: pathNodeIds,
        startNodeId,
        goalNodeId,
        accessibility: {
          mode: accessible ? 'accessible' : 'standard',
          ...summarizePathAccessibility(pathNodeIds, this.edgeAttributes),
        },
      },
    };
  }
}

export default DijkstraRoutingService;
