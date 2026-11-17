import { isValidCoordinate, calculateHaversineDistance, calculateRouteProgress } from '../utils/geoAdapters.js';

/**
 * @typedef {'idle' | 'ready' | 'navigating' | 'finished'} NavigationStatus
 */

/**
 * @typedef {Object} RouteProgressState
 * @property {number} totalDistanceMeters Distancia total de la ruta en metros.
 * @property {number} traversedDistanceMeters Distancia recorrida desde el inicio en metros.
 * @property {number} remainingDistanceMeters Distancia restante hasta el destino final en metros.
 * @property {number} progressPercent Porcentaje de avance (0.0 a 100.0).
 * @property {number} currentSegmentIndex Índice del segmento geométrico activo.
 * @property {number} distanceToRouteMeters Distancia en metros a la polilínea de la ruta.
 * @property {boolean} isOffRoute true si el usuario se encuentra a más de 25m de la ruta.
 * @property {string} activeProvider Proveedor del tramo activo ('osrm' | 'dijkstra' | 'hybrid').
 * @property {{ latitude: number, longitude: number }} projectedPoint Punto proyectado ortogonalmente sobre la ruta.
 */

/**
 * @typedef {Object} NavigationState
 * @property {NavigationStatus} status Estado actual de la navegación.
 * @property {boolean} isNavigating Indica si la navegación activa está en curso.
 * @property {boolean} isArrived Indica si el usuario ha alcanzado el destino.
 * @property {number|null} distanceToDestinationMeters Distancia estimada restante al punto final en metros.
 * @property {import('./RoutingService.js').RouteResult|null} routeResult Ruta activa actual.
 * @property {RouteProgressState|null} progress Información del avance geométrico sobre la ruta.
 */

/**
 * Servicio puro de dominio para la gestión del estado de navegación, precálculo de geometría y cálculo de progreso.
 * Completamente agnóstico de frameworks de UI (React, Expo) y visores cartográficos (MapLibre, Google Maps).
 */
export class NavigationService {
  /**
   * @param {Object} [options]
   * @param {number} [options.arrivalToleranceMeters=12] Tolerancia en metros para considerar llegada al destino.
   * @param {number} [options.offRouteThresholdMeters=25] Umbral en metros para considerar fuera de ruta.
   */
  constructor({ arrivalToleranceMeters = 12, offRouteThresholdMeters = 25 } = {}) {
    this.arrivalToleranceMeters = arrivalToleranceMeters;
    this.offRouteThresholdMeters = offRouteThresholdMeters;

    this.status = 'idle';
    this.routeResult = null;
    this.currentPosition = null;
    this.distanceToDestinationMeters = null;
    this.isArrived = false;

    // Caché de precálculo de la ruta activa
    this.routeGeometryCache = null;
    this.lastSegmentIndex = null;
    this.progress = null;
  }

  /**
   * Establece una nueva ruta activa y precalcula sus distancias geométricas acumuladas.
   *
   * @param {import('./RoutingService.js').RouteResult} routeResult Objeto de ruta de SIGMA.
   * @returns {NavigationState} Estado de navegación actualizado.
   */
  setRoute(routeResult) {
    if (!routeResult || !Array.isArray(routeResult.coordinates) || routeResult.coordinates.length < 2) {
      throw new Error('[NavigationService] Se requiere un objeto RouteResult válido con al menos 2 coordenadas.');
    }

    this.routeResult = routeResult;
    this.status = 'ready';
    this.isArrived = false;
    this.lastSegmentIndex = 0;
    this.progress = null;

    // Precálculo de geometría de ruta (O(N) una sola vez al cargar la ruta)
    const coords = routeResult.coordinates;
    const numSegments = coords.length - 1;
    const segmentDistances = [];
    const cumulativeDistances = [0];

    for (let i = 0; i < numSegments; i++) {
      const d = calculateHaversineDistance(coords[i], coords[i + 1]);
      segmentDistances.push(d);
      cumulativeDistances.push(cumulativeDistances[i] + d);
    }

    this.routeGeometryCache = {
      segmentDistances,
      cumulativeDistances,
      totalDistanceMeters: cumulativeDistances[numSegments],
    };

    return this.getState();
  }

  /**
   * Inicia la navegación activa a lo largo de la ruta establecida.
   *
   * @param {import('./RoutingService.js').RouteResult} [routeResult] Ruta opcional para establecer si aún no está lista.
   * @param {{ latitude: number, longitude: number }} [currentPosition] Posición inicial del usuario.
   * @returns {NavigationState} Estado de navegación actualizado.
   */
  startNavigation(routeResult = null, currentPosition = null) {
    if (routeResult) {
      this.setRoute(routeResult);
    }

    if (!this.routeResult) {
      throw new Error('[NavigationService] No es posible iniciar la navegación sin un RouteResult activo.');
    }

    this.status = 'navigating';
    this.isArrived = false;

    if (currentPosition && isValidCoordinate(currentPosition)) {
      this.updateUserPosition(currentPosition);
    }

    return this.getState();
  }

  /**
   * Detiene temporalmente la navegación activa manteniendo la ruta en estado "ready".
   *
   * @returns {NavigationState} Estado de navegación actualizado.
   */
  stopNavigation() {
    if (this.status === 'navigating') {
      this.status = this.routeResult ? 'ready' : 'idle';
    }
    return this.getState();
  }

  /**
   * Limpia y restablece por completo el estado de navegación y precálculos.
   *
   * @returns {NavigationState} Estado de navegación inicial.
   */
  clearNavigation() {
    this.status = 'idle';
    this.routeResult = null;
    this.currentPosition = null;
    this.distanceToDestinationMeters = null;
    this.isArrived = false;
    this.routeGeometryCache = null;
    this.lastSegmentIndex = null;
    this.progress = null;
    return this.getState();
  }

  /**
   * Actualiza la posición GPS actual del usuario, calcula el avance geométrico utilizando el precálculo
   * y evalúa la proximidad/llegada al punto final de la ruta.
   *
   * @param {{ latitude: number, longitude: number }} currentPosition Coordenada actual del usuario.
   * @returns {NavigationState} Estado de navegación actualizado.
   */
  updateUserPosition(currentPosition) {
    if (!isValidCoordinate(currentPosition)) {
      return this.getState();
    }

    this.currentPosition = currentPosition;

    if (!this.routeResult || !Array.isArray(this.routeResult.coordinates) || this.routeResult.coordinates.length < 2) {
      return this.getState();
    }

    // 1. Cálculo de progreso geométrico reutilizando precálculo y búsqueda por ventana local
    const progressResult = calculateRouteProgress(currentPosition, this.routeResult.coordinates, {
      offRouteThresholdMeters: this.offRouteThresholdMeters,
      lastSegmentIndex: this.lastSegmentIndex,
      cumulativeDistances: this.routeGeometryCache?.cumulativeDistances,
      segmentDistances: this.routeGeometryCache?.segmentDistances,
    });

    this.lastSegmentIndex = progressResult.currentSegmentIndex;

    // 2. Determinar proveedor activo en caso de ruta híbrida
    let activeProvider = this.routeResult.provider || 'unknown';
    if (this.routeResult.provider === 'hybrid' && this.routeResult.metadata?.segments) {
      const segs = this.routeResult.metadata.segments;
      const osrmDist = typeof segs[0]?.distanceMeters === 'number' ? segs[0].distanceMeters : 0;
      if (progressResult.traversedDistanceMeters <= osrmDist) {
        activeProvider = segs[0]?.provider || 'osrm';
      } else {
        activeProvider = segs[1]?.provider || 'dijkstra';
      }
    }

    this.progress = {
      ...progressResult,
      activeProvider,
    };

    // 3. Evaluación de distancia directa al destino final para tolerancia de llegada (12m)
    const finalCoordinate = this.routeResult.coordinates[this.routeResult.coordinates.length - 1];
    const distToFinal = calculateHaversineDistance(currentPosition, finalCoordinate);

    this.distanceToDestinationMeters = Math.round(distToFinal);

    if ((this.status === 'navigating' || this.status === 'ready') && distToFinal <= this.arrivalToleranceMeters) {
      this.status = 'finished';
      this.isArrived = true;
      this.progress = {
        ...this.progress,
        remainingDistanceMeters: 0,
        progressPercent: 100,
        traversedDistanceMeters: this.progress.totalDistanceMeters,
      };
    }

    return this.getState();
  }

  /**
   * Retorna una copia inmutable del estado actual de la navegación.
   *
   * @returns {NavigationState}
   */
  getState() {
    return Object.freeze({
      status: this.status,
      isNavigating: this.status === 'navigating',
      isArrived: this.isArrived,
      distanceToDestinationMeters: this.progress ? this.progress.remainingDistanceMeters : this.distanceToDestinationMeters,
      routeResult: this.routeResult,
      progress: this.progress,
    });
  }
}

export default NavigationService;
