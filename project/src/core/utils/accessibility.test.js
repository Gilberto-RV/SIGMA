import { classifyEdge, accessibleEdgeCost, summarizePathAccessibility, edgeKey } from './accessibility.js';
import { buildGraph } from './graphUtils.js';
import { DijkstraRoutingService } from '../services/DijkstraRoutingService.js';
import { campusGeo } from '../services/campusGeoFixtures.node.js';

console.log('--- Probando reglas de accesibilidad y ruta accesible ---');

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

// 1. Clasificación de tramos
assert(classifyEdge(undefined) === 'unknown', 'Sin atributos → desconocido');
assert(classifyEdge({ escaleras: true }) === 'blocked', 'Escaleras sin rampa → bloqueado');
assert(classifyEdge({ escaleras: true, rampa: true }) === 'accessible', 'Escaleras con rampa → accesible');
assert(classifyEdge({ pendiente_pct: 15 }) === 'blocked', 'Pendiente de 15 % → bloqueado');
assert(classifyEdge({ pendiente_pct: 10 }) === 'difficult', 'Pendiente de 10 % → difícil');
assert(classifyEdge({ superficie: 'grava' }) === 'difficult', 'Grava → difícil');
assert(classifyEdge({ ancho_m: 0.6 }) === 'blocked', 'Paso de 60 cm → bloqueado');
assert(classifyEdge({ superficie: 'pavimento', pendiente_pct: 4 }) === 'accessible', 'Pavimento con 4 % → accesible');
assert(accessibleEdgeCost({ escaleras: true }, 10) === Infinity, 'Costo bloqueado = Infinity');
assert(accessibleEdgeCost({ pendiente_pct: 10 }, 10) === 30, 'Pendiente difícil triplica el costo');
assert(accessibleEdgeCost(undefined, 10) === 10, 'Sin datos conserva el costo');
assert(edgeKey('B', 'A') === edgeKey('A', 'B'), 'edgeKey no dirigida');

// 2. Grafo sintético: A→B→D es corto pero A–B tiene escaleras; A→C→D es más largo y sin datos
const node = (id, lng, lat) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: { id } });
const tramo = (from, to, coords, attrs = {}) => ({
  type: 'Feature',
  geometry: { type: 'LineString', coordinates: coords },
  properties: { id: `${from}-${to}`, tipo: 'CAMINO', from, to, ...attrs },
});
const A = [-98.1200, 19.4070];
const B = [-98.1199, 19.4071];
const C = [-98.1205, 19.4078];
const D = [-98.1198, 19.4073];
const features = [
  node('A', ...A), node('B', ...B), node('C', ...C), node('D', ...D),
  tramo('A', 'B', [A, B], { escaleras: true }),
  tramo('B', 'D', [B, D], { superficie: 'pavimento' }),
  tramo('A', 'C', [A, C]),
  tramo('C', 'D', [C, D]),
];

const built = buildGraph(features);
assert(built.edgeAttributes[edgeKey('A', 'B')].escaleras === true, 'buildGraph guarda atributos del tramo');
assert(built.edgeAttributes[edgeKey('A', 'C')] === undefined, 'Tramos sin atributos no se guardan');

const service = new DijkstraRoutingService({ geoJsonFeatures: features });
const standard = await service.calculateRoute('A', 'D');
assert(standard.metadata.nodePath.join('') === 'ABD', `Ruta estándar esperada ABD, obtenida ${standard.metadata.nodePath.join('')}`);
assert(standard.metadata.accessibility.blocked === 1, 'La ruta estándar debe reportar el tramo con escaleras');

const accessible = await service.calculateRoute('A', 'D', { accessible: true });
assert(accessible.metadata.nodePath.join('') === 'ACD', `Ruta accesible esperada ACD, obtenida ${accessible.metadata.nodePath.join('')}`);
assert(accessible.metadata.accessibility.mode === 'accessible', 'Modo accesible en metadata');
assert(accessible.metadata.accessibility.unknown === 2 && accessible.metadata.accessibility.blocked === 0, 'Resumen de la ruta accesible');

// 3. Si el único camino tiene escaleras → NO_ACCESSIBLE_ROUTE
const onlyStairs = new DijkstraRoutingService({
  geoJsonFeatures: [node('A', ...A), node('B', ...B), tramo('A', 'B', [A, B], { escaleras: true })],
});
let code = null;
try { await onlyStairs.calculateRoute('A', 'B', { accessible: true }); } catch (e) { code = e.code; }
assert(code === 'NO_ACCESSIBLE_ROUTE', 'Debe avisar que no hay ruta accesible');

// 4. Datos reales del campus (aún sin atributos): misma ruta en ambos modos, todo "desconocido"
const campus = new DijkstraRoutingService({ geoJsonFeatures: [...campusGeo.entradas.features, ...campusGeo.caminos.features] });
const origin = { latitude: 19.40719130839912, longitude: -98.12107448617152 };
const r1 = await campus.calculateRoute(origin, 'EE-12');
const r2 = await campus.calculateRoute(origin, 'EE-12', { accessible: true });
assert(r1.metadata.nodePath.join() === r2.metadata.nodePath.join(), 'Sin datos, la ruta accesible no cambia');
assert(r2.metadata.accessibility.unknown === r2.metadata.accessibility.total, 'Todos los tramos del campus aún son desconocidos');

// 5. Resumen sobre una ruta vacía
assert(summarizePathAccessibility(['A']).total === 0, 'Ruta de un nodo no tiene tramos');

console.log('✅ Todos los tests de accesibilidad y ruta accesible pasaron exitosamente!');
