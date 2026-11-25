import { HttpGeoRepository, GEO_CACHE_KEY } from './HttpGeoRepository.js';
import { mergeLayers, withBuildingHeights, isFeatureCollection } from '../../core/geo/geoLayers.js';

console.log('--- Probando HttpGeoRepository + geoLayers ---');

const fc = (id) => ({
  type: 'FeatureCollection',
  features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [-98.12, 19.407] }, properties: { id } }],
});
const bundled = { buildings: fc('B-bundled'), paths: fc('P-bundled'), entrances: fc('E-bundled'), perimeter: fc('X-bundled') };

const memoryStorage = (initial = {}) => {
  const data = { ...initial };
  return {
    data,
    async getItem(key) { return key in data ? data[key] : null; },
    async setItem(key, value) { data[key] = value; },
  };
};

const fakeHttp = ({ version, layers, fail = false }) => ({
  calls: [],
  async get(url) {
    this.calls.push(url);
    if (fail) throw new Error('Network Error');
    if (url === '/geo/version') return { data: { version } };
    if (url === '/geo') return { data: { version, layers } };
    throw new Error(`URL inesperada ${url}`);
  },
});

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const firstId = (layer) => layer.features[0].properties.id;

// 1. Sin conexión ni caché → empaquetadas
{
  const repo = new HttpGeoRepository({ http: fakeHttp({ fail: true }), storage: memoryStorage(), bundled });
  const r = await repo.getLayers();
  assert(r.source === 'bundled' && firstId(r.layers.paths) === 'P-bundled', 'Debe usar las capas empaquetadas');
}

// 2. Servidor con versión nueva → descarga, mezcla capa por capa y guarda en caché
{
  const storage = memoryStorage();
  const http = fakeHttp({ version: 200, layers: { paths: fc('P-remote'), buildings: { type: 'FeatureCollection', features: [] } } });
  const repo = new HttpGeoRepository({ http, storage, bundled });
  const r = await repo.getLayers();
  assert(r.source === 'remote' && r.version === 200, 'Debe usar el servidor');
  assert(firstId(r.layers.paths) === 'P-remote', 'Debe tomar la capa remota válida');
  assert(firstId(r.layers.buildings) === 'B-bundled', 'Una capa remota vacía debe caer al respaldo');
  assert(JSON.parse(storage.data[GEO_CACHE_KEY]).version === 200, 'Debe guardar la versión en caché');
}

// 3. Caché al día → no descarga /geo otra vez
{
  const storage = memoryStorage({ [GEO_CACHE_KEY]: JSON.stringify({ version: 200, layers: { paths: fc('P-cache') } }) });
  const http = fakeHttp({ version: 200, layers: { paths: fc('P-remote') } });
  const repo = new HttpGeoRepository({ http, storage, bundled });
  const r = await repo.getLayers();
  assert(r.source === 'cache' && firstId(r.layers.paths) === 'P-cache', 'Debe usar la caché si está al día');
  assert(!http.calls.includes('/geo'), 'No debe descargar las capas si la versión no cambió');
}

// 4. Sin conexión pero con caché → caché
{
  const storage = memoryStorage({ [GEO_CACHE_KEY]: JSON.stringify({ version: 150, layers: { entrances: fc('E-cache') } }) });
  const repo = new HttpGeoRepository({ http: fakeHttp({ fail: true }), storage, bundled });
  const r = await repo.getLayers();
  assert(r.source === 'cache' && firstId(r.layers.entrances) === 'E-cache', 'Sin conexión debe usar la caché');
}

// 5. Caché corrupta → se ignora
{
  const storage = memoryStorage({ [GEO_CACHE_KEY]: '{no es json' });
  const repo = new HttpGeoRepository({ http: fakeHttp({ fail: true }), storage, bundled });
  const r = await repo.getLayers();
  assert(r.source === 'bundled', 'Una caché corrupta no debe romper la carga');
}

// 6. Servidor sin capas (versión 0) → empaquetadas
{
  const repo = new HttpGeoRepository({ http: fakeHttp({ version: 0, layers: {} }), storage: memoryStorage(), bundled });
  const r = await repo.getLayers();
  assert(r.source === 'bundled', 'Versión 0 significa que el servidor no tiene capas');
}

// 7. mergeLayers e isFeatureCollection
assert(!isFeatureCollection(null) && !isFeatureCollection({ type: 'FeatureCollection', features: [] }), 'isFeatureCollection');
assert(firstId(mergeLayers(bundled, undefined).perimeter) === 'X-bundled', 'mergeLayers sin override');

// 8. withBuildingHeights: medida > niveles de BD × 3.5 > 1 nivel
{
  const buildings = {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', geometry: null, properties: { id: 'A', altura_m: 12 } },
      { type: 'Feature', geometry: null, properties: { id: 'B' } },
      { type: 'Feature', geometry: null, properties: { id: 'C' } },
    ],
  };
  const out = withBuildingHeights(buildings, { A: 2, B: 3 });
  const h = Object.fromEntries(out.features.map((f) => [f.properties.id, f.properties.altura_m]));
  assert(h.A === 12, 'La altura medida tiene prioridad');
  assert(h.B === 10.5, 'Tres niveles de la BD → 10.5 m');
  assert(h.C === 3.5, 'Sin dato → un nivel');
  assert(buildings.features[1].properties.altura_m === undefined, 'No debe mutar la capa original');
}

console.log('✅ Todos los tests de HttpGeoRepository y geoLayers pasaron exitosamente!');
