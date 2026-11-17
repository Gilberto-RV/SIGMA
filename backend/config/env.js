// config/env.js
// Debe importarse antes que cualquier módulo que lea process.env al cargarse
// (por ejemplo services/mlService.js). Con ESM, `dotenv.config()` dentro de server.js
// se ejecutaba después de evaluar las rutas y sus servicios.
import 'dotenv/config';

const RECOMMENDED_SECRET_LENGTH = 32;

/**
 * Devuelve el secreto JWT. No hay valor por defecto: sin secreto cualquiera podría firmar tokens.
 * @returns {string}
 */
export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no está configurado. Defínelo en backend/.env (ver backend/.env.example).');
  }
  return secret;
}

/**
 * Valida las variables obligatorias al arrancar el servidor.
 * @param {{ requireDatabase?: boolean }} [options]
 */
export function validateEnv({ requireDatabase = true } = {}) {
  const required = ['JWT_SECRET', ...(requireDatabase ? ['MONGO_URI'] : [])];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno obligatorias: ${missing.join(', ')}. ` +
        'Copia backend/.env.example a backend/.env y complétalo.'
    );
  }
  if (process.env.JWT_SECRET.length < RECOMMENDED_SECRET_LENGTH) {
    console.warn(
      `⚠️  JWT_SECRET tiene menos de ${RECOMMENDED_SECRET_LENGTH} caracteres. ` +
        'Genera uno nuevo con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
    );
  }
}
