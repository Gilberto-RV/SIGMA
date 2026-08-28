import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

// Rutas
import buildingRoutes from './routes/buildingRoutes.js';
import authRoutes from './routes/authRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import bigDataRoutes from './routes/bigDataRoutes.js';

// Conexión y modelos
import connectDB from './config/db.js';
import './models/Building.js';
import './models/Career.js';
import './models/Service.js';
import './models/Auth.js'; // Asegúrate de que este archivo esté correctamente exportado
import './models/Categories.js';
import './models/Event.js';

// Modelos de Big Data
import './models/BigData/BuildingAnalytics.js';
import './models/BigData/EventAnalytics.js';

// Jobs de procesamiento por lotes
import { startScheduledJobs } from './jobs/batchProcessor.js';

// Configuración
dotenv.config();
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Root health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Innova2026 Backend API',
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// Rutas
app.use('/api/buildings', buildingRoutes);
app.use('/api/auth', authRoutes); // ← nueva ruta para autenticación
app.use('/api/events', eventRoutes); // ← nueva ruta para eventos
app.use('/api/bigdata', bigDataRoutes); // ← rutas de Big Data

// Manejadores de errores globales
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js';
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  
  // Iniciar trabajos programados de procesamiento por lotes
  if (process.env.ENABLE_BATCH_PROCESSING === 'true') {
    startScheduledJobs();
  }
});
