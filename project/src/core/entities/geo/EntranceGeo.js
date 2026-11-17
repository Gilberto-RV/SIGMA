// src/core/entities/geo/EntranceGeo.js

import { geoJSONToCoordinate } from '../../utils/geoAdapters';

/**
 * Entidad que representa un punto de entrada o acceso al campus / edificios en SIGMA.
 */
export class EntranceGeo {
  constructor({ id, name, tipo = 'ENTRADA_EDIFICIO', conexiones = [], edificioAsociado = null, coordinate = null, rawProperties = {} }) {
    this.id = id;
    this.name = name;
    this.tipo = tipo;
    this.conexiones = Array.isArray(conexiones) ? conexiones : [];
    this.edificioAsociado = edificioAsociado;
    this.coordinate = coordinate; // { latitude, longitude }
    this.rawProperties = rawProperties;
  }

  static fromGeoJSONFeature(feature) {
    if (!feature || !feature.properties) {
      throw new Error('[EntranceGeo] Feature GeoJSON inválido para EntranceGeo');
    }

    const { id, name, tipo, conexiones, edificio_asociado } = feature.properties;
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

    let coordinate = null;
    if (feature.geometry && feature.geometry.type === 'Point' && feature.geometry.coordinates) {
      coordinate = geoJSONToCoordinate(feature.geometry.coordinates);
    }

    return new EntranceGeo({
      id: id || feature.id,
      name: name || 'Entrada',
      tipo: tipo || 'ENTRADA_EDIFICIO',
      conexiones: parsedConexiones,
      edificioAsociado: edificio_asociado || null,
      coordinate,
      rawProperties: feature.properties,
    });
  }
}
