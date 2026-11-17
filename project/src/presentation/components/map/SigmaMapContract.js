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
 * @property {object | string | null} [selectedBuilding=null]
 *   Edificio actualmente seleccionado (objeto o ID) para resaltado visual en el mapa.
 *
 * @property {(building: object) => void} [onBuildingPress]
 *   Callback invocado cuando el usuario hace clic o tap sobre un edificio.
 *
 * @property {(coordinate: { latitude: number, longitude: number }) => void} [onMapPress]
 *   Callback invocado cuando se hace clic en cualquier zona libre del mapa.
 *
 * @property {Array<{ latitude: number, longitude: number }>} [route=[]]
 *   Arreglo de coordenadas que representan una ruta activa para ser renderizada en el mapa.
 *
 * @property {boolean} [interactive=true]
 *   Indica si el mapa permite manipulación por parte del usuario (pan, zoom, rotación).
 *
 * @property {object} [style]
 *   Estilos visuales del contenedor React Native.
 */

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
  selectedBuilding: null,
  onBuildingPress: null,
  onMapPress: null,
  route: [],
  interactive: true,
};
