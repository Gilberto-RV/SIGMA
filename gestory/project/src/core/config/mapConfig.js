// src/core/config/mapConfig.js

/**
 * Configuración centralizada de MapTiler / OpenStreetMap para el panel Web Gestory (Vite).
 *
 * Esta utilidad valida la presencia de la variable de entorno pública
 * VITE_MAPTILER_API_KEY y evita que valores undefined o vacíos
 * se propaguen silenciosamente al motor de renderizado cartográfico WebGL.
 */

/**
 * Obtiene la API Key de MapTiler configurada en el entorno web.
 * Lanza un error descriptivo si la variable no está definida o está vacía.
 *
 * @returns {string} La API Key de MapTiler.
 * @throws {Error} Si VITE_MAPTILER_API_KEY no está configurada.
 */
export const getMapTilerApiKey = () => {
  const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    const message =
      '[SIGMA Gestory MapConfig] La variable de entorno VITE_MAPTILER_API_KEY no está configurada o está vacía. ' +
      'Por favor, crea o edita el archivo .env.local en gestory/project/ definiendo VITE_MAPTILER_API_KEY=<tu_clave>. ' +
      'Consulta docs/mapping/environment.md para más información.';

    if (import.meta.env.DEV) {
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
  const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;
  return typeof apiKey === 'string' && apiKey.trim().length > 0;
};

export const mapConfig = {
  get apiKey() {
    return getMapTilerApiKey();
  },
  isConfigured: isMapTilerConfigured,
};

export default mapConfig;
