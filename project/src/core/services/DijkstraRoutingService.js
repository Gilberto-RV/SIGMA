import { buildGraph, findNearestNode, findRoute } from '../utils/graphUtils.js';
import { isValidCoordinate } from '../utils/geoAdapters.js';
import { createRequire } from 'module';

let defaultEntradas = { features: [] };
let defaultCaminos = { features: [] };

try {
  const require = createRequire(import.meta.url);
  defaultEntradas = require('../../../assets/geo/Entradas.json');
  defaultCaminos = require('../../../assets/geo/caminos.json');
} catch (e) {
  // Fallback si createRequire no está disponible en cierto bundler
}

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
  constructor({ graph = null, nodeCoords = null, geoJsonFeatures = null } = {}) {
    if (graph && nodeCoords) {
      this.graph = graph;
      this.nodeCoords = nodeCoords;
    } else {
      const features = geoJsonFeatures || [
        ...(defaultEntradas.features || []),
        ...(defaultCaminos.features || []),
      ];
      const built = buildGraph(features);
      this.graph = built.graph;
      this.nodeCoords = built.nodeCoords;
    }
  }

  /**
   * Calcula una ruta dentro de la red peatonal del campus utilizando Dijkstra.
   *
   * @param {{ latitude: number, longitude: number } | string} origin Coordenada o ID del nodo de origen.
   * @param {{ latitude: number, longitude: number } | string} destination Coordenada o ID del nodo de destino.
   * @param {Object} [options]
   * @param {number} [options.walkingSpeedMs=1.2] Velocidad promedio de caminata en m/s.
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

    const pathNodeIds = findRoute(this.graph, startNodeId, goalNodeId, this.nodeCoords);

    if (!pathNodeIds || pathNodeIds.length === 0) {
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
      },
    };
  }
}

export default DijkstraRoutingService;
