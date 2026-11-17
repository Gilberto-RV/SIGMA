// src/core/entities/geo/BuildingGeo.js

import { geoJSONToCoordinate } from '../../utils/geoAdapters';

/**
 * Entidad que representa la metadata y referencia geoespacial de un Edificio de SIGMA.
 * No duplica la geometría pesada del GeoJSON, sino que provee una interfaz tipada y ligera.
 */
export class BuildingGeo {
  constructor({ id, name, tipo = 'EDIFICIO', conexiones = [], centroid = null, rawProperties = {} }) {
    this.id = id;
    this.name = name;
    this.tipo = tipo;
    this.conexiones = Array.isArray(conexiones) ? conexiones : [];
    this.centroid = centroid; // { latitude, longitude }
    this.rawProperties = rawProperties;
  }

  /**
   * Instancia una entidad BuildingGeo a partir de un Feature GeoJSON de Edificios.json
   * @param {object} feature Feature GeoJSON
   * @returns {BuildingGeo}
   */
  static fromGeoJSONFeature(feature) {
    if (!feature || !feature.properties) {
      throw new Error('[BuildingGeo] Feature GeoJSON inválido para BuildingGeo');
    }

    const { id, name, tipo, conexiones } = feature.properties;
    let parsedConexiones = [];
    if (typeof conexiones === 'string') {
      try {
        parsedConexiones = JSON.parse(conexiones);
      } catch (e) {
        parsedConexiones = [];
      }
    } else if (Array.isArray(conexiones)) {
      parsedConexiones = conexiones;
    }

    // Calcular centroide a partir del primer anillo si existe
    let centroid = null;
    if (feature.geometry && feature.geometry.type === 'Polygon' && feature.geometry.coordinates?.[0]) {
      const ring = feature.geometry.coordinates[0];
      const lats = ring.map(c => c[1]);
      const lngs = ring.map(c => c[0]);
      centroid = {
        latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
        longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      };
    }

    return new BuildingGeo({
      id: id || feature.id,
      name: name || 'Sin nombre',
      tipo: tipo || 'EDIFICIO',
      conexiones: parsedConexiones,
      centroid,
      rawProperties: feature.properties,
    });
  }
}
