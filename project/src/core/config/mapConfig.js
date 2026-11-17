// src/core/config/mapConfig.js

/**
 * Configuración centralizada de MapTiler / OpenStreetMap para la aplicación móvil (Expo).
 *
 * Esta utilidad valida la presencia de la variable de entorno pública
 * EXPO_PUBLIC_MAPTILER_API_KEY y evita que valores undefined o vacíos
 * se propaguen silenciosamente al motor de renderizado cartográfico.
 */

const isDevelopment =
  typeof __DEV__ !== 'undefined'
    ? __DEV__
    : process.env.NODE_ENV !== 'production';

/**
 * Obtiene la API Key de MapTiler configurada en el entorno.
 * Lanza un error descriptivo si la variable no está definida o está vacía.
 *
 * @returns {string} La API Key de MapTiler.
 * @throws {Error} Si EXPO_PUBLIC_MAPTILER_API_KEY no está configurada.
 */
export const getMapTilerApiKey = () => {
  const apiKey = process.env.EXPO_PUBLIC_MAPTILER_API_KEY;

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    const message =
      '[SIGMA MapConfig] La variable de entorno EXPO_PUBLIC_MAPTILER_API_KEY no está configurada o está vacía. ' +
      'Por favor, crea o edita el archivo .env.local en la raíz de project/ definiendo EXPO_PUBLIC_MAPTILER_API_KEY=<tu_clave>. ' +
      'Consulta docs/mapping/environment.md para más información.';

    if (isDevelopment) {
      console.warn(message);
    }
    throw new Error(message);
  }

  return apiKey.trim();
};

/**
 * Verifica si la clave de MapTiler se encuentra actualmente disponible en el entorno
 * sin arrojar excepciones.
 *
 * @returns {boolean} True si la clave existe y no está vacía.
 */
export const isMapTilerConfigured = () => {
  const apiKey = process.env.EXPO_PUBLIC_MAPTILER_API_KEY;
  return typeof apiKey === 'string' && apiKey.trim().length > 0;
};

export const OSRM_BASE_URL =
  process.env.EXPO_PUBLIC_OSRM_URL || 'https://router.project-osrm.org';

export const mapConfig = {
  get apiKey() {
    return getMapTilerApiKey();
  },
  isConfigured: isMapTilerConfigured,
  osrmBaseUrl: OSRM_BASE_URL,
};

export default mapConfig;
