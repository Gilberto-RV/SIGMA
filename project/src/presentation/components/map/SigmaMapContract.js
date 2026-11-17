// src/presentation/components/map/SigmaMapContract.js

/**
 * Contrato formal y documentación de propiedades para el componente unificado <SigmaMap />.
 *
 * Este contrato define la interfaz estándar que tanto la implementación Web (MapLibre GL JS)
 * como la futura implementación nativa Android (MapLibre React Native) deben cumplir.
 *
 * @typedef {Object} SigmaMapProps
 * @property {{ latitude: number, longitude: number }} [initialCenter={ latitude: 19.4074, longitude: -98.1198 }]
 *   Centro geográfico inicial del visor.
 *
 * @property {number} [initialZoom=17]
 *   Nivel de zoom inicial (escala MapLibre 0-22).
 *
 * @property {object} [buildings=null]
 *   FeatureCollection GeoJSON con los polígonos y datos de edificios (e.g. Edificios.json).
 *
 * @property {object} [paths=null]
 *   FeatureCollection GeoJSON con las líneas de la red de senderos peatonales (e.g. caminos.json).
 *
 * @property {object} [entrances=null]
 *   FeatureCollection GeoJSON con los puntos de entrada (e.g. Entradas.json).
 *
 * @property {object} [campusBoundary=null]
 *   FeatureCollection GeoJSON con el límite perimetral del campus (e.g. PerimetroCampus.json).
 *
 * @property {{ latitude: number, longitude: number } | null} [userLocation=null]
 *   Coordenada actual del usuario para mostrar el indicador de posición.
 *
 * @property {boolean} [isSimulatedUser=false]
 *   Si es true, `userLocation` es una posición simulada (usuario fuera del campus) y se dibuja
 *   con un marcador propio en lugar del indicador GPS nativo.
 *
 * @property {Array<{ id: string, name: string, coordinates: { latitude: number, longitude: number } }>} [buildingMarkers=[]]
 *   Pines interactivos de edificios (centroide + nombre). Implementado en nativo.
 *
 * @property {object | string | null} [selectedBuilding=null]
 *   Edificio actualmente seleccionado (objeto o ID) para resaltado visual en el mapa.
 *
 * @property {(building: object) => void} [onBuildingPress]
 *   Callback invocado cuando el usuario hace clic o tap sobre un edificio. Recibe un Feature
 *   GeoJSON (o un objeto con `properties.id`).
 *
 * @property {(coordinate: { latitude: number, longitude: number }) => void} [onMapPress]
 *   Callback invocado cuando se hace clic en cualquier zona libre del mapa.
 *
 * @property {import('../../../core/services/RoutingService.js').RouteResult | null} [routeResult=null]
 *   Ruta activa calculada por RoutingService; se convierte a GeoJSON con routeResultToGeoJSON.
 *
 * @property {{ primary?: string, secondary?: string, path?: string, entrance?: string, perimeter?: string }} [colors]
 *   Colores del tema (ThemeContext). Implementado en nativo; web usa la paleta por defecto.
 *
 * @property {boolean} [is3D=false]
 *   Vista 3D: edificios extruidos con `properties.altura_m` y cámara inclinada (SIGMA_PITCH_3D).
 *
 * @property {boolean} [interactive=true]
 *   Indica si el mapa permite manipulación por parte del usuario (pan, zoom, rotación).
 *
 * @property {object} [style]
 *   Estilos visuales del contenedor React Native.
 *
 * API imperativa (ref) común a web y nativo:
 *   ref.current.flyTo({ center: [longitude, latitude], zoom?, duration?, pitch?, bearing? })
 */

/** Límites del campus como [[minLng, minLat], [maxLng, maxLat]]. */
export const SIGMA_CAMPUS_BOUNDS = [
  [-98.1255, 19.4045],
  [-98.1160, 19.4125],
];

export const SIGMA_MIN_ZOOM = 15;
/** Inclinación de la cámara en la vista 3D (grados). */
export const SIGMA_PITCH_3D = 55;
/** Altura usada si un edificio no trae `altura_m` (un nivel). */
export const SIGMA_DEFAULT_BUILDING_HEIGHT_M = 3.5;
export const SIGMA_MAX_ZOOM = 20;

/** Paleta por defecto de las capas del campus (coincide con SigmaMapWeb). */
export const SIGMA_MAP_COLORS = {
  primary: '#043c55',
  secondary: '#0284c7',
  path: '#94a3b8',
  entrance: '#10b981',
  perimeter: '#0ea5e9',
};

export const SIGMA_MAP_DEFAULT_PROPS = {
  initialCenter: {
    latitude: 19.4074,
    longitude: -98.1198,
  },
  initialZoom: 17,
  buildings: null,
  paths: null,
  entrances: null,
  campusBoundary: null,
  userLocation: null,
  isSimulatedUser: false,
  buildingMarkers: [],
  selectedBuilding: null,
  onBuildingPress: null,
  onMapPress: null,
  routeResult: null,
  colors: SIGMA_MAP_COLORS,
  is3D: false,
  interactive: true,
};
