import { geoJSONToCoordinates, calculateHaversineDistance, isValidCoordinate } from '../utils/geoAdapters.js';

const WALKING_SPEED_MPS = 1.3;

/**
 * @typedef {Object} RouteResult
 * @property {Array<{ latitude: number, longitude: number }>} coordinates Lista ordenada de puntos de la ruta.
 * @property {number} distanceMeters Distancia total estimada en metros.
 * @property {number} durationSeconds Tiempo total estimado en segundos.
 * @property {'osrm' | 'dijkstra' | 'hybrid'} provider Proveedor del motor de enrutamiento.
 * @property {Object} [metadata] Metadatos opcionales de la ruta.
 */

/**
 * Concatena secuencias de coordenadas eliminando puntos de transición duplicados.
 *
 * @param {Array<Array<{ latitude: number, longitude: number }>>} segmentsCoordinates Lista de arreglos de coordenadas.
 * @returns {Array<{ latitude: number, longitude: number }>} Arreglo unificado continuo de coordenadas.
 */
export function concatenateCoordinates(segmentsCoordinates) {
  if (!Array.isArray(segmentsCoordinates)) return [];
  const result = [];

  for (let i = 0; i < segmentsCoordinates.length; i++) {
    const coords = segmentsCoordinates[i];
    if (!Array.isArray(coords) || coords.length === 0) continue;

    for (let j = 0; j < coords.length; j++) {
      const pt = coords[j];
      if (result.length > 0) {
        const last = result[result.length - 1];
        if (
          Math.abs(last.latitude - pt.latitude) < 0.000001 &&
          Math.abs(last.longitude - pt.longitude) < 0.000001
        ) {
          continue;
        }
      }
      result.push(pt);
    }
  }

  return result;
}

/**
 * Fachada principal del servicio de enrutamiento de SIGMA.
 * Coordinador de rutas utilizando motores externos (OSRM), motores internos (Dijkstra)
 * y resolución automática de accesos al campus (CampusAccessService).
 */
/**
 * Tramo en línea recta usado cuando el servidor OSRM no responde.
 * @returns {import('./RoutingService.js').RouteResult | null} null si los extremos no son coordenadas.
 */
export function buildDirectSegment(from, to, cause = null) {
  if (!isValidCoordinate(from) || !isValidCoordinate(to)) return null;
  const distanceMeters = calculateHaversineDistance(from, to);
  return {
    coordinates: [from, to],
    distanceMeters: Math.round(distanceMeters),
    durationSeconds: Math.round(distanceMeters / WALKING_SPEED_MPS),
    provider: 'direct',
    metadata: { fallback: true, reason: cause?.message || 'Servidor de rutas no disponible' },
  };
}

export class RoutingService {
  /**
   * @param {Object} dependencies
   * @param {import('../../infrastructure/http/OsrmClient.js').OsrmClient} dependencies.osrmClient Cliente HTTP de OSRM.
   * @param {import('./DijkstraRoutingService.js').DijkstraRoutingService} dependencies.dijkstraRoutingService Adaptador de la red interna Dijkstra.
   * @param {import('./CampusAccessService.js').CampusAccessService} [dependencies.campusAccessService] Servicio de resolución de accesos del campus.
   */
  constructor({ osrmClient, dijkstraRoutingService, campusAccessService = null }) {
    if (!osrmClient) {
      throw new Error('[RoutingService] Se requiere una instancia de OsrmClient.');
    }
    if (!dijkstraRoutingService) {
      throw new Error('[RoutingService] Se requiere una instancia de DijkstraRoutingService.');
    }
    this.osrmClient = osrmClient;
    this.dijkstraRoutingService = dijkstraRoutingService;
    this.campusAccessService = campusAccessService;
  }

  /**
   * Calcula una ruta externa entre un punto de origen y un destino utilizando OSRM.
   *
   * @param {{ latitude: number, longitude: number }} origin Coordenada de origen.
   * @param {{ latitude: number, longitude: number }} destination Coordenada de destino.
   * @param {Object} [options]
   * @param {string} [options.profile] Perfil de la URL de OSRM (por defecto OSRM_PROFILE de mapConfig).
   * @returns {Promise<RouteResult>} Resultado de ruta normalizado en formato SIGMA.
   */
  async calculateExternalRoute(origin, destination, options = {}) {
    if (!origin || !destination) {
      throw new Error('[RoutingService] Origen y destino son obligatorios para calcular la ruta externa.');
    }

    const osrmRoute = await this.osrmClient.route([origin, destination], options);

    const geoJsonPositions = osrmRoute.geometry.coordinates;
    const normalizedCoordinates = geoJSONToCoordinates(geoJsonPositions);

    return {
      coordinates: normalizedCoordinates,
      distanceMeters: Math.round(osrmRoute.distance || 0),
      durationSeconds: Math.round(osrmRoute.duration || 0),
      provider: 'osrm',
      metadata: {
        profile: options.profile || 'default',
        weightName: osrmRoute.weight_name || null,
        weight: osrmRoute.weight || 0,
        legCount: Array.isArray(osrmRoute.legs) ? osrmRoute.legs.length : 0,
      },
    };
  }

  /**
   * Calcula una ruta interna del campus utilizando Dijkstra.
   *
   * @param {{ latitude: number, longitude: number } | string} origin Coordenada u origen.
   * @param {{ latitude: number, longitude: number } | string} destination Coordenada o destino.
   * @param {Object} [options]
   * @returns {Promise<RouteResult>} Resultado de ruta normalizado en formato SIGMA.
   */
  async calculateCampusRoute(origin, destination, options = {}) {
    if (!origin || !destination) {
      throw new Error('[RoutingService] Origen y destino son obligatorios para calcular la ruta del campus.');
    }

    return await this.dijkstraRoutingService.calculateRoute(origin, destination, options);
  }

  /**
   * Calcula una ruta híbrida orquestando OSRM y Dijkstra.
   * Selecciona automáticamente las puertas de acceso del campus (entryPoint / exitPoint) si no son provistas.
   *
   * @param {{ latitude: number, longitude: number } | string} origin Punto de partida.
   * @param {{ latitude: number, longitude: number } | string} destination Punto de llegada.
   * @param {Object} [options]
   * @param {boolean} [options.isOriginInternal] Sobrescribe la detección automática de origen interno.
   * @param {boolean} [options.isDestinationInternal] Sobrescribe la detección automática de destino interno.
   * @param {{ latitude: number, longitude: number } | string} [options.entryPoint] Punto de acceso al campus opcional.
   * @param {{ latitude: number, longitude: number } | string} [options.exitPoint] Punto de salida del campus opcional.
   * @param {string} [options.externalProfile] Perfil de OSRM para tramos externos.
   * @param {boolean} [options.allowDirectFallback=true] Si OSRM falla, usar un tramo en línea recta.
   * @returns {Promise<RouteResult>} Resultado unificado de la ruta.
   */
  async calculateHybridRoute(origin, destination, options = {}) {
    if (!origin || !destination) {
      throw new Error('[RoutingService] Origen y destino son obligatorios para calcular la ruta híbrida.');
    }

    // Detección de origen interno / externo
    const isOriginInternal = typeof options.isOriginInternal === 'boolean'
      ? options.isOriginInternal
      : (typeof origin === 'string' || (this.campusAccessService && this.campusAccessService.isPointInCampus(origin)));

    // Detección de destino interno / externo
    const isDestinationInternal = typeof options.isDestinationInternal === 'boolean'
      ? options.isDestinationInternal
      : (typeof destination === 'string' || (this.campusAccessService && this.campusAccessService.isPointInCampus(destination)));

    // CASO D: Interno -> Interno -> Delegar directamente a Dijkstra
    if (isOriginInternal && isDestinationInternal) {
      return await this.calculateCampusRoute(origin, destination, options);
    }

    // CASO E: Externo -> Externo (sin tránsito por campus indicado) -> Delegar directamente a OSRM
    if (!isOriginInternal && !isDestinationInternal && !options.entryPoint && !options.exitPoint) {
      return await this.calculateExternalRoute(origin, destination, {
        ...options,
        profile: options.externalProfile || options.profile,
      });
    }

    let resolvedEntryPoint = options.entryPoint || null;
    let selectedEntryPointObj = null;

    let resolvedExitPoint = options.exitPoint || null;
    let selectedExitPointObj = null;

    // Autoselección de entryPoint si el origen es externo y el destino es interno
    if (!isOriginInternal && isDestinationInternal && !resolvedEntryPoint) {
      if (!this.campusAccessService) {
        throw new Error('[RoutingService] Se requiere entryPoint explícito o campusAccessService registrado.');
      }
      selectedEntryPointObj = this.campusAccessService.findNearestCampusEntrance(origin);
      resolvedEntryPoint = selectedEntryPointObj.coordinate;
    }

    // Autoselección de exitPoint si el origen es interno y el destino es externo
    if (isOriginInternal && !isDestinationInternal && !resolvedExitPoint) {
      if (!this.campusAccessService) {
        throw new Error('[RoutingService] Se requiere exitPoint explícito o campusAccessService registrado.');
      }
      selectedExitPointObj = this.campusAccessService.findNearestCampusEntrance(destination);
      resolvedExitPoint = selectedExitPointObj.coordinate;
    }

    // Definición de segmentos
    const segmentDefinitions = [];

    if (!isOriginInternal && isDestinationInternal) {
      if (!resolvedEntryPoint) {
        throw new Error('[RoutingService] Se requiere entryPoint para calcular la ruta híbrida.');
      }
      segmentDefinitions.push(
        { provider: 'osrm', from: origin, to: resolvedEntryPoint },
        { provider: 'dijkstra', from: resolvedEntryPoint, to: destination }
      );
    } else if (isOriginInternal && !isDestinationInternal) {
      if (!resolvedExitPoint) {
        throw new Error('[RoutingService] Se requiere exitPoint para calcular la ruta híbrida.');
      }
      segmentDefinitions.push(
        { provider: 'dijkstra', from: origin, to: resolvedExitPoint },
        { provider: 'osrm', from: resolvedExitPoint, to: destination }
      );
    } else if (!isOriginInternal && !isDestinationInternal) {
      if (!resolvedEntryPoint || !resolvedExitPoint) {
        throw new Error('[RoutingService] Se requiere definir entryPoint y exitPoint explícitamente para rutas de tránsito externo-interno-externo.');
      }
      segmentDefinitions.push(
        { provider: 'osrm', from: origin, to: resolvedEntryPoint },
        { provider: 'dijkstra', from: resolvedEntryPoint, to: resolvedExitPoint },
        { provider: 'osrm', from: resolvedExitPoint, to: destination }
      );
    }

    // Ejecución de los segmentos
    const warnings = [];
    const executedSegments = [];
    const segmentsCoordinates = [];
    let totalDistanceMeters = 0;
    let totalDurationSeconds = 0;

    for (let i = 0; i < segmentDefinitions.length; i++) {
      const segDef = segmentDefinitions[i];
      let segResult;

      try {
        if (segDef.provider === 'osrm') {
          try {
            segResult = await this.calculateExternalRoute(segDef.from, segDef.to, {
              ...options,
              profile: options.externalProfile || options.profile,
            });
          } catch (osrmError) {
            // Sin servidor de rutas externo: tramo directo aproximado hasta/desde la entrada,
            // para que la parte dentro del campus (lo importante) siga funcionando.
            const direct = options.allowDirectFallback === false ? null : buildDirectSegment(segDef.from, segDef.to, osrmError);
            if (!direct) throw osrmError;
            segResult = direct;
            warnings.push('external_route_unavailable');
          }
        } else {
          segResult = await this.calculateCampusRoute(segDef.from, segDef.to, options);
        }
      } catch (err) {
        const error = new Error(`[RoutingService] Falló el segmento ${i + 1} (${segDef.provider}): ${err.message}`);
        error.code = 'ROUTING_SEGMENT_FAILED';
        error.provider = segDef.provider;
        error.segment = i + 1;
        throw error;
      }

      totalDistanceMeters += segResult.distanceMeters || 0;
      totalDurationSeconds += segResult.durationSeconds || 0;
      segmentsCoordinates.push(segResult.coordinates);

      executedSegments.push({
        segmentIndex: i + 1,
        provider: segResult.provider,
        distanceMeters: segResult.distanceMeters,
        durationSeconds: segResult.durationSeconds,
        from: segDef.from,
        to: segDef.to,
        metadata: segResult.metadata || {},
      });
    }

    const unifiedCoordinates = concatenateCoordinates(segmentsCoordinates);

    return {
      coordinates: unifiedCoordinates,
      distanceMeters: Math.round(totalDistanceMeters),
      durationSeconds: Math.round(totalDurationSeconds),
      provider: 'hybrid',
      metadata: {
        isHybrid: true,
        selectedEntryPoint: selectedEntryPointObj || resolvedEntryPoint || null,
        selectedExitPoint: selectedExitPointObj || resolvedExitPoint || null,
        segmentCount: executedSegments.length,
        segments: executedSegments,
        warnings,
      },
    };
  }
}

export default RoutingService;
