// models/GeoLayer.js — capas GeoJSON del campus editables desde Gestory.
import mongoose from 'mongoose';

/** Capas disponibles y el archivo empaquetado en la app del que se siembran. */
export const GEO_LAYERS = ['buildings', 'paths', 'entrances', 'perimeter'];

const GeoLayerSchema = new mongoose.Schema(
  {
    _id: { type: String, enum: GEO_LAYERS },
    // FeatureCollection completa (RFC 7946). Se valida en validators/geoSchemas.js.
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true, minimize: false }
);

export default mongoose.model('GeoLayer', GeoLayerSchema, 'geo_layers');
