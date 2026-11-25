// src/core/geo/geoLayers.js — utilidades puras para las capas GeoJSON del campus.
// Sin dependencias de React Native: se prueban con Node (geoLayers.test.js).

/** Capas del campus, con los mismos nombres que la API /api/geo. */
export const GEO_LAYER_KEYS = ['buildings', 'paths', 'entrances', 'perimeter'];

/** Altura estimada por nivel mientras no haya alturas medidas en campo (decisión D5). */
export const METERS_PER_FLOOR = 3.5;

export const isFeatureCollection = (value) =>
  Boolean(value) &&
  value.type === 'FeatureCollection' &&
  Array.isArray(value.features) &&
  value.features.length > 0;

/**
 * Combina capas capa por capa: usa la de `override` si es una FeatureCollection válida
 * y, si no, la de `base`. Así una capa ausente o dañada en el servidor no deja el mapa vacío.
 */
export function mergeLayers(base, override) {
  const result = {};
  for (const key of GEO_LAYER_KEYS) {
    result[key] = isFeatureCollection(override?.[key]) ? override[key] : base[key];
  }
  return result;
}

/**
 * Agrega `altura_m` y `niveles` a cada edificio para la vista 3D.
 * Prioridad: altura medida en el GeoJSON > niveles de la BD × 3.5 m > 1 nivel.
 * @param {object} buildingsCollection FeatureCollection de edificios.
 * @param {Record<string, number>} floorsById Niveles por id de edificio (de MongoDB).
 */
export function withBuildingHeights(buildingsCollection, floorsById = {}) {
  if (!isFeatureCollection(buildingsCollection)) return buildingsCollection;
  return {
    ...buildingsCollection,
    features: buildingsCollection.features.map((feature) => {
      const props = feature.properties || {};
      const measured = typeof props.altura_m === 'number' && props.altura_m > 0 ? props.altura_m : null;
      const floors = Number(floorsById[props.id]) || Number(props.niveles) || 1;
      return {
        ...feature,
        properties: {
          ...props,
          niveles: floors,
          altura_m: measured ?? floors * METERS_PER_FLOOR,
        },
      };
    }),
  };
}
