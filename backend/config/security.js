// config/security.js
import rateLimit from 'express-rate-limit';

// Orígenes de desarrollo: Gestory (Vite) y la app Expo en web.
const DEFAULT_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
];

/**
 * Opciones de CORS a partir de CORS_ORIGINS (lista separada por comas, o `*` para permitir todo).
 * Las peticiones sin cabecera Origin (app nativa, curl, servicios) siempre se permiten:
 * CORS solo protege a los navegadores.
 */
export function buildCorsOptions(env = process.env) {
  const raw = env.CORS_ORIGINS?.trim();
  if (raw === '*') {
    return { origin: true };
  }
  const allowlist = raw
    ? raw.split(',').map((origin) => origin.trim()).filter(Boolean)
    : DEFAULT_DEV_ORIGINS;

  return {
    origin(origin, callback) {
      if (!origin || allowlist.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
  };
}

/**
 * Limita los intentos de login/registro por IP (fuerza bruta y registro masivo).
 * AUTH_RATE_LIMIT permite ajustarlo (p. ej. en pruebas).
 */
export function createAuthRateLimiter(env = process.env) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(env.AUTH_RATE_LIMIT) || 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
  });
}
