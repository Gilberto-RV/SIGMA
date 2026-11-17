// src/core/entities/geo/PathGeo.js

/**
 * Entidad que representa un segmento peatonal o cruce de la red de caminos de SIGMA.
 */
export class PathGeo {
  constructor({ id, name = '', tipo = 'CAMINO', from = null, to = null, distanciaMetros = 0, rawProperties = {} }) {
    this.id = id;
    this.name = name;
    this.tipo = tipo;
    this.from = from;
    this.to = to;
    this.distanciaMetros = distanciaMetros;
    this.rawProperties = rawProperties;
  }

  static fromGeoJSONFeature(feature) {
    if (!feature || !feature.properties) {
      throw new Error('[PathGeo] Feature GeoJSON inválido para PathGeo');
    }

    const { id, name, tipo, from, to, distancia_metros } = feature.properties;

    return new PathGeo({
      id: id || feature.id,
      name: name || '',
      tipo: tipo || 'CAMINO',
      from: from || null,
      to: to || null,
      distanciaMetros: typeof distancia_metros === 'number' ? distancia_metros : 0,
      rawProperties: feature.properties,
    });
  }
}
