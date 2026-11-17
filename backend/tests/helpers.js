// tests/helpers.js — arranca una MongoDB en memoria y la app Express para supertest.
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

export const TEST_JWT_SECRET = 'test-secret-'.padEnd(64, 'x');

/**
 * Configura el entorno de prueba ANTES de importar la app
 * (config/env.js carga backend/.env, pero dotenv no sobrescribe variables ya definidas).
 */
export async function startTestApp({ authRateLimit = '1000' } = {}) {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.AUTH_RATE_LIMIT = authRateLimit;
  process.env.NODE_ENV = 'test';
  process.env.CORS_ORIGINS = '';

  await mongoose.connect(process.env.MONGO_URI);
  const { createApp } = await import('../app.js');
  const User = (await import('../models/Auth.js')).default;

  return {
    app: createApp(),
    User,
    async stop() {
      await mongoose.disconnect();
      await mongod.stop();
    },
  };
}
