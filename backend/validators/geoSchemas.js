// validators/geoSchemas.js — validación de capas GeoJSON del campus.
import { z } from 'zod';

// Margen alrededor del campus (≈ 2 km) para rechazar coordenadas invertidas o basura.
export const CAMPUS_BBOX = { minLng: -98.145, maxLng: -98.095, minLat: 19.385, maxLat: 19.43 };

const position = z
  .tuple([z.number(), z.number()])
  .rest(z.number())
  .refine(
    ([lng, lat]) =>
      lng >= CAMPUS_BBOX.minLng && lng <= CAMPUS_BBOX.maxLng && lat >= CAMPUS_BBOX.minLat && lat <= CAMPUS_BBOX.maxLat,
    { message: 'Coordenada fuera del área del campus (¿latitud y longitud invertidas?)' }
  );

const ring = z.array(position).min(4, 'Un anillo de polígono necesita al menos 4 posiciones');

const geometries = {
  Point: z.object({ type: z.literal('Point'), coordinates: position }),
  LineString: z.object({ type: z.literal('LineString'), coordinates: z.array(position).min(2) }),
  Polygon: z.object({ type: z.literal('Polygon'), coordinates: z.array(ring).min(1) }),
  MultiPolygon: z.object({ type: z.literal('MultiPolygon'), coordinates: z.array(z.array(ring).min(1)).min(1) }),
};

/**
 * Atributos de accesibilidad de un tramo de camino (todos opcionales: sin dato = desconocido).
 * Ver docs/mapping/geo-data.md.
 */
export const pathAccessibilitySchema = z.object({
  escaleras: z.boolean().optional(),
  rampa: z.boolean().optional(),
  pendiente_pct: z.number().min(0).max(100).optional(),
  superficie: z.enum(['pavimento', 'adoquin', 'tierra', 'pasto', 'grava', 'otro']).optional(),
  ancho_m: z.number().min(0).max(50).optional(),
});

const buildingPropsSchema = z.object({
  id: z.string().min(1, 'Cada edificio necesita properties.id'),
  altura_m: z.number().min(0).max(200).optional(),
  niveles: z.number().int().min(0).max(50).optional(),
});

const pointOrLineProps = z.object({ id: z.string().min(1, 'Cada elemento necesita properties.id') });

/** Tipos de geometría y propiedades permitidos por capa. */
const LAYER_RULES = {
  buildings: { geometry: z.union([geometries.Polygon, geometries.MultiPolygon]), properties: buildingPropsSchema },
  paths: {
    geometry: z.union([geometries.LineString, geometries.Point]),
    properties: pointOrLineProps.extend(pathAccessibilitySchema.shape),
  },
  entrances: { geometry: geometries.Point, properties: pointOrLineProps },
  perimeter: {
    geometry: z.union([geometries.Polygon, geometries.MultiPolygon, geometries.LineString]),
    properties: z.object({}).passthrough(),
  },
};

/**
 * Esquema de FeatureCollection para una capa. Las propiedades adicionales se conservan
 * (passthrough): los GeoJSON del campus traen campos propios como `conexiones` o `tipo`.
 */
export function featureCollectionSchema(layer) {
  const rules = LAYER_RULES[layer];
  const feature = z.object({
    type: z.literal('Feature'),
    id: z.union([z.string(), z.number()]).optional(),
    geometry: rules.geometry,
    properties: rules.properties.passthrough(),
  });
  return z.object({
    type: z.literal('FeatureCollection'),
    features: z.array(feature).min(1, 'La capa no puede quedar vacía').max(5000),
  });
}
