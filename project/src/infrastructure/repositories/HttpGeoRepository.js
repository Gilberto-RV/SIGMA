// src/infrastructure/repositories/HttpGeoRepository.js
// Capas del campus desde el backend (/api/geo) con caché local y respaldo empaquetado.
// Las dependencias (cliente HTTP, almacenamiento) se inyectan para poder probarlo en Node.
import { mergeLayers, isFeatureCollection } from '../../core/geo/geoLayers.js';

export const GEO_CACHE_KEY = 'sigma_geo_layers_v1';

/**
 * @typedef {{ source: 'remote' | 'cache' | 'bundled', version: number, layers: Record<string, object> }} GeoLayersResult
 */
export class HttpGeoRepository {
  /**
   * @param {{ http: { get: Function }, storage: { getItem: Function, setItem: Function }, bundled: object, cacheKey?: string }} deps
   */
  constructor({ http, storage, bundled, cacheKey = GEO_CACHE_KEY }) {
    this.http = http;
    this.storage = storage;
    this.bundled = bundled;
    this.cacheKey = cacheKey;
  }

  async readCache() {
    try {
      const raw = await this.storage.getItem(this.cacheKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return typeof parsed?.version === 'number' && parsed.layers ? parsed : null;
    } catch {
      return null;
    }
  }

  async fetchRemoteVersion() {
    try {
      const { data } = await this.http.get('/geo/version', { timeout: 5000 });
      return typeof data?.version === 'number' ? data.version : null;
    } catch {
      return null; // sin conexión o backend apagado
    }
  }

  /**
   * Devuelve las capas más recientes disponibles:
   * servidor (si su versión es más nueva que la caché) → caché → empaquetadas.
   * @returns {Promise<GeoLayersResult>}
   */
  async getLayers() {
    const cached = await this.readCache();
    const remoteVersion = await this.fetchRemoteVersion();

    if (remoteVersion && (!cached || remoteVersion > cached.version)) {
      try {
        const { data } = await this.http.get('/geo', { timeout: 10000 });
        const hasAnyLayer = Object.values(data?.layers || {}).some(isFeatureCollection);
        if (hasAnyLayer) {
          const layers = mergeLayers(this.bundled, data.layers);
          await this.storage.setItem(this.cacheKey, JSON.stringify({ version: data.version, layers })).catch?.(() => {});
          return { source: 'remote', version: data.version, layers };
        }
      } catch {
        // continúa con la caché o el respaldo
      }
    }

    if (cached) {
      return { source: 'cache', version: cached.version, layers: mergeLayers(this.bundled, cached.layers) };
    }
    return { source: 'bundled', version: 0, layers: { ...this.bundled } };
  }
}

export default HttpGeoRepository;
