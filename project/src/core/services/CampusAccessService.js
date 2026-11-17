import { buildGraph } from '../utils/graphUtils.js';
import { isValidCoordinate, calculateHaversineDistance, isPointInPolygon } from '../utils/geoAdapters.js';

// Los GeoJSON del campus se inyectan desde fuera (ServiceContainer en la app, fixtures en las
// pruebas). No importar `module`/`createRequire`: Metro no puede resolverlos en Android.
const EMPTY_COLLECTION = { features: [] };

/**
 * @typedef {'CAMPUS_ENTRANCE' | 'BUILDING_ENTRANCE'} AccessType
 */

/**
 * @typedef {Object} CampusAccessPoint
 * @property {string} id Identificador único del acceso (e.g. "EP-003", "EE-12").
 * @property {string} name Nombre descriptivo del acceso.
 * @property {AccessType} type Tipo de acceso (CAMPUS_ENTRANCE o BUILDING_ENTRANCE).
 * @property {{ latitude: number, longitude: number }} coordinate Ubicación geográfica exacta.
 * @property {string} nodeId Identificador del nodo en el grafo de Dijkstra.
 * @property {string} [buildingId] Identificador del edificio asociado (si aplica).
 * @property {boolean} enabled Estado activo del acceso.
 */

/**
 * Servicio encargado de gestionar y resolver los puntos de acceso del campus,
 * las entradas a edificios y la evaluación de pertenencia geográfica (Geofencing).
 */
export class CampusAccessService {
  /**
   * @param {Object} [options]
   * @param {Object} [options.geoJsonEntradas] GeoJSON de Entradas.
   * @param {Object} [options.geoJsonCaminos] GeoJSON de Caminos.
   * @param {Object} [options.geoJsonEdificios] GeoJSON de Edificios.
   * @param {Object} [options.geoJsonPerimetro] GeoJSON de Perímetro.
   */
  constructor({
    geoJsonEntradas = null,
    geoJsonCaminos = null,
    geoJsonEdificios = null,
    geoJsonPerimetro = null,
  } = {}) {
    const entradas = geoJsonEntradas || EMPTY_COLLECTION;
    const caminos = geoJsonCaminos || EMPTY_COLLECTION;
    const edificios = geoJsonEdificios || EMPTY_COLLECTION;
    const perimetro = geoJsonPerimetro || EMPTY_COLLECTION;
    if (!geoJsonEntradas || !geoJsonPerimetro) {
      console.warn('[CampusAccessService] Faltan GeoJSON de entradas/perímetro: inyéctalos en el constructor.');
    }

    this.accessPointsMap = new Map();
    this.campusBoundaryPolygon = [];

    this._initializeBoundary(perimetro);
    this._initializeAccessPoints(entradas, caminos, edificios);
  }

  /** @private */
  _initializeBoundary(perimetroGeoJSON) {
    if (
      perimetroGeoJSON &&
      Array.isArray(perimetroGeoJSON.features) &&
      perimetroGeoJSON.features.length > 0
    ) {
      const feat = perimetroGeoJSON.features[0];
      if (feat?.geometry?.coordinates) {
        this.campusBoundaryPolygon = feat.geometry.coordinates;
      }
    }
  }

  /** @private */
  _initializeAccessPoints(entradasGeoJSON, caminosGeoJSON, edificiosGeoJSON) {
    // 1. Cargar Entradas de Edificios desde Entradas.json
    if (entradasGeoJSON && Array.isArray(entradasGeoJSON.features)) {
      entradasGeoJSON.features.forEach(f => {
        if (f.properties && f.properties.id && f.geometry && f.geometry.coordinates) {
          const [lon, lat] = f.geometry.coordinates;
          const accessPoint = {
            id: f.properties.id,
            name: f.properties.name || `Entrada ${f.properties.id}`,
            type: 'BUILDING_ENTRANCE',
            coordinate: { latitude: lat, longitude: lon },
            nodeId: f.properties.id,
            buildingId: f.properties.edificio_asociado || null,
            enabled: true,
          };
          this.accessPointsMap.set(accessPoint.id, accessPoint);
        }
      });
    }

    // 2. Construir nodos de accesos al campus (EP-003, AP-003, AP-004, etc.) desde caminos.json
    if (caminosGeoJSON && Array.isArray(caminosGeoJSON.features)) {
      const { nodeCoords } = buildGraph(caminosGeoJSON.features);

      // Identificadores de accesos perimetrales del campus reconocidos
      const campusEntranceIds = ['EP-003', 'AP-003', 'AP-004'];

      campusEntranceIds.forEach(id => {
        const coord = nodeCoords[id];
        if (coord && isValidCoordinate(coord)) {
          let name = 'Acceso al Campus';
          if (id === 'EP-003') name = 'Entrada Principal (EP-003)';
          else if (id === 'AP-003') name = 'Acceso Peatonal Poniente (AP-003)';
          else if (id === 'AP-004') name = 'Acceso Peatonal Oriente (AP-004)';

          const accessPoint = {
            id,
            name,
            type: 'CAMPUS_ENTRANCE',
            coordinate: coord,
            nodeId: id,
            buildingId: null,
            enabled: true,
          };
          this.accessPointsMap.set(accessPoint.id, accessPoint);
        }
      });
    }
  }

  /**
   * Determina si una coordenada dada se encuentra dentro del perímetro del campus.
   * @param {{ latitude: number, longitude: number }} coordinate
   * @returns {boolean}
   */
  isPointInCampus(coordinate) {
    if (!isValidCoordinate(coordinate)) return false;
    return isPointInPolygon(coordinate, this.campusBoundaryPolygon);
  }

  /**
   * Retorna todos los accesos perimetrales al campus.
   * @returns {Array<CampusAccessPoint>}
   */
  getCampusEntrances() {
    return Array.from(this.accessPointsMap.values()).filter(
      ap => ap.type === 'CAMPUS_ENTRANCE' && ap.enabled
    );
  }

  /**
   * Retorna todas las entradas a edificios.
   * @returns {Array<CampusAccessPoint>}
   */
  getBuildingEntrances() {
    return Array.from(this.accessPointsMap.values()).filter(
      ap => ap.type === 'BUILDING_ENTRANCE' && ap.enabled
    );
  }

  /**
   * Obtiene un acceso por su identificador único.
   * @param {string} id
   * @returns {CampusAccessPoint|null}
   */
  getAccessById(id) {
    if (!id) return null;
    return this.accessPointsMap.get(id) || null;
  }

  /**
   * Obtiene la puerta de entrada asociada a un edificio específico.
   * @param {string} buildingId ID del edificio (e.g. "E-12").
   * @returns {CampusAccessPoint|null}
   * @throws {Error} Si no se encuentra entrada asociada.
   */
  getBuildingEntrance(buildingId) {
    if (!buildingId) {
      const err = new Error('[CampusAccessService] buildingId es requerido.');
      err.code = 'BUILDING_ID_REQUIRED';
      throw err;
    }

    const entrance = Array.from(this.accessPointsMap.values()).find(
      ap => ap.type === 'BUILDING_ENTRANCE' && ap.buildingId === buildingId && ap.enabled
    );

    if (!entrance) {
      const err = new Error(`[CampusAccessService] No se encontró entrada registrada para el edificio ${buildingId}.`);
      err.code = 'CAMPUS_ACCESS_NOT_FOUND';
      throw err;
    }

    return entrance;
  }

  /**
   * Encuentra el acceso de entrada/salida al campus más cercano a una coordenada dada.
   * @param {{ latitude: number, longitude: number }} coordinate
   * @returns {CampusAccessPoint}
   * @throws {Error} Si la coordenada es inválida o no hay accesos disponibles.
   */
  findNearestCampusEntrance(coordinate) {
    if (!isValidCoordinate(coordinate)) {
      const err = new Error(`[CampusAccessService] Coordenada inválida: ${JSON.stringify(coordinate)}`);
      err.code = 'INVALID_COORDINATE';
      throw err;
    }

    const entrances = this.getCampusEntrances();
    if (entrances.length === 0) {
      const err = new Error('[CampusAccessService] No hay accesos al campus disponibles.');
      err.code = 'CAMPUS_ACCESS_NOT_FOUND';
      throw err;
    }

    let closestEntrance = null;
    let minDistance = Infinity;

    entrances.forEach(entrance => {
      const dist = calculateHaversineDistance(coordinate, entrance.coordinate);
      if (dist < minDistance) {
        minDistance = dist;
        closestEntrance = entrance;
      }
    });

    return closestEntrance;
  }

  /**
   * Encuentra la entrada a edificio más cercana a una coordenada dada.
   * @param {{ latitude: number, longitude: number }} coordinate
   * @returns {CampusAccessPoint}
   */
  findNearestBuildingEntrance(coordinate) {
    if (!isValidCoordinate(coordinate)) {
      const err = new Error(`[CampusAccessService] Coordenada inválida: ${JSON.stringify(coordinate)}`);
      err.code = 'INVALID_COORDINATE';
      throw err;
    }

    const entrances = this.getBuildingEntrances();
    if (entrances.length === 0) {
      const err = new Error('[CampusAccessService] No hay entradas a edificios disponibles.');
      err.code = 'CAMPUS_ACCESS_NOT_FOUND';
      throw err;
    }

    let closestEntrance = null;
    let minDistance = Infinity;

    entrances.forEach(entrance => {
      const dist = calculateHaversineDistance(coordinate, entrance.coordinate);
      if (dist < minDistance) {
        minDistance = dist;
        closestEntrance = entrance;
      }
    });

    return closestEntrance;
  }

  /**
   * Verfica si un ID corresponde a un acceso al campus.
   * @param {string} id
   * @returns {boolean}
   */
  isCampusEntrance(id) {
    const ap = this.getAccessById(id);
    return Boolean(ap && ap.type === 'CAMPUS_ENTRANCE');
  }

  /**
   * Verifica si un ID corresponde a una entrada de edificio.
   * @param {string} id
   * @returns {boolean}
   */
  isBuildingEntrance(id) {
    const ap = this.getAccessById(id);
    return Boolean(ap && ap.type === 'BUILDING_ENTRANCE');
  }
}

export default CampusAccessService;
