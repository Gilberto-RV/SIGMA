// src/core/utils/graphUtils.js
import { edgeKey } from './accessibility.js';

const ACCESSIBILITY_KEYS = ['escaleras', 'rampa', 'pendiente_pct', 'superficie', 'ancho_m'];

/**
 * Construye el grafo de la red peatonal.
 * @returns {{ graph: Record<string, string[]>, nodeCoords: Record<string, {latitude:number, longitude:number}>,
 *             edgeAttributes: Record<string, object> }} edgeAttributes: atributos de accesibilidad por tramo
 *             (clave edgeKey(from, to)); solo incluye tramos con algún atributo.
 */
export function buildGraph(features) {
  const graph = {};
  const nodeCoords = {};
  const edgeAttributes = {};

  features.forEach(feature => {
    const { properties, geometry } = feature;

    // Registrar coordenadas del nodo si es tipo Punto
    if (geometry.type === 'Point' && properties && properties.id) {
      const [lon, lat] = geometry.coordinates;
      nodeCoords[properties.id] = { latitude: lat, longitude: lon };
    }

    // Registrar caminos (from <-> to)
    if (properties && properties.tipo === 'CAMINO' && properties.from && properties.to) {
      if (!graph[properties.from]) graph[properties.from] = [];
      if (!graph[properties.to]) graph[properties.to] = [];

      graph[properties.from].push(properties.to);
      graph[properties.to].push(properties.from);

      const attrs = {};
      for (const key of ACCESSIBILITY_KEYS) {
        if (properties[key] !== undefined && properties[key] !== null) attrs[key] = properties[key];
      }
      if (Object.keys(attrs).length > 0) {
        edgeAttributes[edgeKey(properties.from, properties.to)] = attrs;
      }

      // Si el camino es LineString y los nodos from o to no tienen coordenadas (como EP-003 o AP-003),
      // extraemos las coordenadas desde el inicio y el fin del LineString.
      if (geometry.type === 'LineString' && geometry.coordinates && geometry.coordinates.length >= 2) {
        if (!nodeCoords[properties.from]) {
          const [lon, lat] = geometry.coordinates[0];
          nodeCoords[properties.from] = { latitude: lat, longitude: lon };
        }
        if (!nodeCoords[properties.to]) {
          const [lon, lat] = geometry.coordinates[geometry.coordinates.length - 1];
          nodeCoords[properties.to] = { latitude: lat, longitude: lon };
        }
      }
    }

    // Registrar conexiones adicionales (conexiones desde nodos como EDIFICIO, ENTRADA, CRUCE)
    if (properties && properties.conexiones) {
      let conexiones = properties.conexiones;
      if (typeof conexiones === 'string') {
        try {
          conexiones = JSON.parse(conexiones);
        } catch (e) {
          conexiones = null;
        }
      }

      if (Array.isArray(conexiones)) {
        if (!graph[properties.id]) graph[properties.id] = [];
        conexiones.forEach(conn => {
          graph[properties.id].push(conn);
          if (!graph[conn]) graph[conn] = [];
          graph[conn].push(properties.id);
        });
      }
    }
  });

  return { graph, nodeCoords, edgeAttributes };
}

export function findNearestNode(coords, nodeCoords, graph) {
  if (!coords || !nodeCoords) return null;
  const lat = coords.latitude;
  const lon = coords.longitude;
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;

  let closestNode = null;
  let minDistance = Infinity;

  for (const [nodeId, nodeCoord] of Object.entries(nodeCoords)) {
    // Solo considerar nodos válidos que formen parte de la red de navegación
    if (graph && (!graph[nodeId] || graph[nodeId].length === 0)) continue;
    if (!nodeCoord || typeof nodeCoord.latitude !== 'number' || typeof nodeCoord.longitude !== 'number') continue;

    const dx = lon - nodeCoord.longitude;
    const dy = lat - nodeCoord.latitude;
    const distSq = dx * dx + dy * dy;

    if (distSq < minDistance) {
      minDistance = distSq;
      closestNode = nodeId;
    }
  }

  return closestNode;
}

/**
 * Dijkstra sobre el grafo del campus.
 * @param {object} [options]
 * @param {(from: string, to: string, baseCost: number) => number} [options.edgeCost]
 *   Ajusta el costo de cada tramo; Infinity lo excluye (p. ej. escaleras en modo accesible).
 */
export function findRoute(graph, start, goal, nodeCoords = {}, options = {}) {
  const edgeCost = typeof options.edgeCost === 'function' ? options.edgeCost : (from, to, base) => base;
  if (!graph || !start || !goal) return null;
  if (!graph[start] || !graph[goal]) return null;

  if (start === goal) {
    return [start];
  }

  // Algoritmo de Dijkstra
  const distances = {};
  const previous = {};
  const unvisited = new Set(Object.keys(graph));
  
  // Initialize distances
  for (const node of unvisited) {
    distances[node] = Infinity;
  }
  distances[start] = 0;
  
  function getDistance(id1, id2) {
    const c1 = nodeCoords[id1];
    const c2 = nodeCoords[id2];
    if (!c1 || !c2) return 1; // Fallback
    const dx = c1.longitude - c2.longitude;
    const dy = c1.latitude - c2.latitude;
    return Math.sqrt(dx * dx + dy * dy);
  }

  const queue = [start];
  
  while (queue.length > 0) {
    queue.sort((a, b) => distances[a] - distances[b]);
    const current = queue.shift();
    
    if (current === goal) {
      const path = [];
      let curr = goal;
      while (curr !== undefined) {
        path.unshift(curr);
        curr = previous[curr];
      }
      return path;
    }
    
    if (distances[current] === Infinity) {
      break;
    }
    
    unvisited.delete(current);
    
    const neighbors = graph[current] || [];
    for (const neighbor of neighbors) {
      if (unvisited.has(neighbor)) {
        const cost = edgeCost(current, neighbor, getDistance(current, neighbor));
        if (!Number.isFinite(cost)) continue;
        const alt = distances[current] + cost;
        if (alt < distances[neighbor]) {
          distances[neighbor] = alt;
          previous[neighbor] = current;
          if (!queue.includes(neighbor)) {
            queue.push(neighbor);
          }
        }
      }
    }
  }

  return null; // No se encontró ruta
}

