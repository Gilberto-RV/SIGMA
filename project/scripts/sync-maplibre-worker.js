import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const sourceDir = path.join(projectRoot, 'node_modules', 'maplibre-gl', 'dist');
const targetDir = path.join(projectRoot, 'public');

const filesToCopy = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];

try {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const fileName of filesToCopy) {
    const srcPath = path.join(sourceDir, fileName);
    const destPath = path.join(targetDir, fileName);

    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`[SIGMA Worker Sync] Copiado exitoso: ${fileName} -> public/`);
    } else {
      console.warn(`[SIGMA Worker Sync] Advertencia: No se encontró ${srcPath}`);
    }
  }
} catch (err) {
  console.error('[SIGMA Worker Sync] Error copiando archivos del worker:', err.message);
  process.exit(1);
}
