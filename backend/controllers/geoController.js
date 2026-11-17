// controllers/geoController.js
import GeoLayer, { GEO_LAYERS } from '../models/GeoLayer.js';
import { featureCollectionSchema } from '../validators/geoSchemas.js';

/** Versión del conjunto: marca de tiempo (ms) de la capa modificada más recientemente. */
const datasetVersion = (layers) =>
  layers.reduce((max, layer) => Math.max(max, new Date(layer.updatedAt).getTime() || 0), 0);

/** GET /api/geo — todas las capas y su versión (público: es el mismo dato que trae la app). */
export const getAllLayers = async (req, res) => {
  try {
    const layers = await GeoLayer.find({}, { data: 1, updatedAt: 1 }).lean();
    res.json({
      version: datasetVersion(layers),
      layers: Object.fromEntries(layers.map((layer) => [layer._id, layer.data])),
    });
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron obtener las capas geográficas' });
  }
};

/** GET /api/geo/version — consulta barata para saber si la app debe descargar de nuevo. */
export const getVersion = async (req, res) => {
  try {
    const layers = await GeoLayer.find({}, { updatedAt: 1 }).lean();
    res.json({ version: datasetVersion(layers), layers: layers.map((layer) => layer._id) });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo obtener la versión de las capas' });
  }
};

/** GET /api/geo/:layer */
export const getLayer = async (req, res) => {
  const { layer } = req.params;
  if (!GEO_LAYERS.includes(layer)) return res.status(404).json({ error: 'Capa desconocida' });
  const doc = await GeoLayer.findById(layer).lean();
  if (!doc) return res.status(404).json({ error: 'Capa sin datos' });
  res.json({ layer, version: new Date(doc.updatedAt).getTime(), data: doc.data });
};

/** PUT /api/geo/:layer — reemplaza una capa (solo administradores). */
export const putLayer = async (req, res) => {
  const { layer } = req.params;
  if (!GEO_LAYERS.includes(layer)) return res.status(404).json({ error: 'Capa desconocida' });

  const result = featureCollectionSchema(layer).safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'GeoJSON inválido',
      details: result.error.issues.slice(0, 20).map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  const ids = result.data.features.map((feature) => feature.properties.id).filter(Boolean);
  const duplicated = ids.find((id, index) => ids.indexOf(id) !== index);
  if (duplicated) {
    return res.status(400).json({ error: `Identificador repetido en la capa: ${duplicated}` });
  }

  const doc = await GeoLayer.findByIdAndUpdate(
    layer,
    { data: result.data, updatedBy: req.user?.userId || null },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  res.json({ layer, version: new Date(doc.updatedAt).getTime(), features: result.data.features.length });
};
