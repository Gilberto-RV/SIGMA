// server.js — punto de entrada: valida el entorno, conecta MongoDB y levanta la API.
// config/env.js va primero: carga .env antes de que otros módulos lean process.env.
import { validateEnv } from './config/env.js';
import connectDB from './config/db.js';
import { createApp } from './app.js';
import { startScheduledJobs } from './jobs/batchProcessor.js';
import { ensureDefaultCategories } from './services/categoryService.js';

try {
  validateEnv();
} catch (error) {
  console.error(`🔴 ${error.message}`);
  process.exit(1);
}

await connectDB();

const createdCategories = await ensureDefaultCategories();
if (createdCategories > 0) {
  console.log(`🏷️  Categorías de eventos creadas: ${createdCategories}`);
}

const app = createApp();
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);

  // Iniciar trabajos programados de procesamiento por lotes
  if (process.env.ENABLE_BATCH_PROCESSING === 'true') {
    startScheduledJobs();
  }
});
