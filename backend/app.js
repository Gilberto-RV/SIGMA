// app.js — construye la aplicación Express sin conectarse a la BD ni escuchar puertos,
// para poder probarla con supertest.
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';

import { buildCorsOptions } from './config/security.js';

// Rutas
import buildingRoutes from './routes/buildingRoutes.js';
import authRoutes from './routes/authRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import bigDataRoutes from './routes/bigDataRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import geoRoutes from './routes/geoRoutes.js';

// Registro de modelos (necesario para populate)
import './models/Building.js';
import './models/Career.js';
import './models/Service.js';
import './models/Auth.js';
import './models/Categories.js';
import './models/Event.js';
import './models/BigData/BuildingAnalytics.js';
import './models/BigData/EventAnalytics.js';

import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js';

const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

export function createApp() {
  const app = express();

  // Detrás de un proxy (Nginx, Render, etc.) para que el rate limit vea la IP real.
  if (process.env.TRUST_PROXY) {
    const hops = Number(process.env.TRUST_PROXY);
    app.set('trust proxy', Number.isNaN(hops) ? process.env.TRUST_PROXY : hops);
  }

  app.use(helmet());
  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: '1mb' }));

  app.get('/', (req, res) => {
    res.json({
      status: 'ok',
      service: 'SIGMA-BULL Backend API',
      timestamp: new Date().toISOString(),
      database: DB_STATES[mongoose.connection.readyState] || 'unknown',
    });
  });

  app.use('/api/buildings', buildingRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/bigdata', bigDataRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/geo', geoRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
