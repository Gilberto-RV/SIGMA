// scripts/seedGeoLayers.js
// Carga en MongoDB las capas GeoJSON empaquetadas en la app (project/assets/geo).
// Solo crea las capas que faltan; con --force reemplaza también las existentes.
//
//   npm run seed-geo            # crea las que no existan
//   npm run seed-geo -- --force # sobrescribe todas con los archivos de la app
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import GeoLayer from '../models/GeoLayer.js';
import { featureCollectionSchema } from '../validators/geoSchemas.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GEO_DIR = path.resolve(__dirname, '../../project/assets/geo');

const SOURCES = {
  buildings: 'Edificios.json',
  paths: 'caminos.json',
  entrances: 'Entradas.json',
  perimeter: 'PerimetroCampus.json',
};

/**
 * @param {{ force?: boolean, geoDir?: string }} [options]
 * @returns {Promise<string[]>} Capas escritas.
 */
export async function seedGeoLayers({ force = false, geoDir = GEO_DIR } = {}) {
  const written = [];
  for (const [layer, file] of Object.entries(SOURCES)) {
    const exists = await GeoLayer.exists({ _id: layer });
    if (exists && !force) continue;

    const data = JSON.parse(fs.readFileSync(path.join(geoDir, file), 'utf8'));
    const result = featureCollectionSchema(layer).safeParse(data);
    if (!result.success) {
      const first = result.error.issues[0];
      throw new Error(`${file} no es válido: ${first.path.join('.')} ${first.message}`);
    }
    await GeoLayer.findByIdAndUpdate(layer, { data: result.data, updatedBy: 'seed' }, { upsert: true });
    written.push(layer);
  }
  return written;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const written = await seedGeoLayers({ force: process.argv.includes('--force') });
    console.log(written.length ? `✅ Capas cargadas: ${written.join(', ')}` : 'ℹ️  Las capas ya existían (usa --force para reemplazarlas).');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}
