import axios from 'axios';
import { OSRM_BASE_URL } from '../../core/config/mapConfig.js';
import { isValidCoordinate } from '../../core/utils/geoAdapters.js';

/**
 * Cliente HTTP para consultar el motor de enrutamiento OSRM (Open Source Routing Machine).
 * Encapsula las solicitudes REST hacia el servidor OSRM y valida la estructura de respuesta.
 */
export class OsrmClient {
  /**
   * @param {Object} [config]
   * @param {string} [config.baseUrl] URL base del servidor OSRM.
   * @param {number} [config.timeout=10000] Tiempo de espera en milisegundos.
   */
  constructor({ baseUrl = OSRM_BASE_URL, timeout = 10000 } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout,
      headers: {
        'Accept': 'application/json',
      },
    });
  }

  /**
   * Solicita una ruta entre dos o más coordenadas en formato SIGMA { latitude, longitude }.
   *
   * @param {Array<{ latitude: number, longitude: number }>} coordinates Lista ordenada de coordenadas.
   * @param {Object} [options]
   * @param {'driving' | 'foot' | 'bike'} [options.profile='driving'] Perfil de transporte.
   * @returns {Promise<Object>} Objeto de ruta de OSRM (routes[0]).
   * @throws {Error} Si las coordenadas son inválidas, la red falla o no existe ruta.
   */
  async route(coordinates, options = {}) {
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      throw new Error('[OsrmClient] Se requieren al menos 2 coordenadas válidas para calcular una ruta.');
    }

    const invalidCoord = coordinates.find(c => !isValidCoordinate(c));
    if (invalidCoord) {
      throw new Error(`[OsrmClient] Coordenada inválida en la solicitud: ${JSON.stringify(invalidCoord)}`);
    }

    const profile = options.profile || 'driving';
    const coordsString = coordinates
      .map(c => `${c.longitude},${c.latitude}`)
      .join(';');

    const url = `/route/v1/${profile}/${coordsString}`;

    try {
      const response = await this.httpClient.get(url, {
        params: {
          overview: 'full',
          geometries: 'geojson',
          steps: false,
        },
      });

      if (!response || response.status !== 200 || !response.data) {
        throw new Error(`[OsrmClient] Respuesta HTTP no exitosa del servidor OSRM. Status: ${response?.status}`);
      }

      const data = response.data;

      if (data.code !== 'Ok') {
        if (data.code === 'NoRoute') {
          throw new Error('[OsrmClient] Ruta no encontrada entre las coordenadas proporcionadas (OSRM: NoRoute).');
        }
        throw new Error(`[OsrmClient] El servidor OSRM devolvió un código de error: ${data.code}`);
      }

      if (!Array.isArray(data.routes) || data.routes.length === 0) {
        throw new Error('[OsrmClient] La respuesta de OSRM no contiene rutas válidas.');
      }

      const selectedRoute = data.routes[0];

      if (
        !selectedRoute.geometry ||
        selectedRoute.geometry.type !== 'LineString' ||
        !Array.isArray(selectedRoute.geometry.coordinates) ||
        selectedRoute.geometry.coordinates.length === 0
      ) {
        throw new Error('[OsrmClient] La geometría de la ruta devuelta por OSRM es inválida o vacía.');
      }

      return selectedRoute;
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error('[OsrmClient] Tiempo de espera agotado al conectar con el servidor OSRM (Timeout).');
      }
      if (error.response) {
        throw new Error(`[OsrmClient] Error en respuesta OSRM (HTTP ${error.response.status}): ${error.response.data?.message || error.message}`);
      }
      if (error.request && !error.response) {
        throw new Error('[OsrmClient] Error de red: No se pudo establecer conexión con el servidor OSRM.');
      }
      throw error;
    }
  }
}

export default OsrmClient;
