// src/core/entities/geo/CampusBoundaryGeo.js

/**
 * Entidad que representa la delimitación del campus de SIGMA.
 */
export class CampusBoundaryGeo {
  constructor({ pointCount = 0, rawFeature = null }) {
    this.pointCount = pointCount;
    this.rawFeature = rawFeature;
  }

  static fromGeoJSONFeature(feature) {
    if (!feature || !feature.geometry) {
      throw new Error('[CampusBoundaryGeo] Feature GeoJSON inválido para CampusBoundaryGeo');
    }

    const pointCount = Array.isArray(feature.geometry.coordinates)
      ? feature.geometry.coordinates.length
      : 0;

    return new CampusBoundaryGeo({
      pointCount,
      rawFeature: feature,
    });
  }
}
