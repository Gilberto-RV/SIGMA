// src/core/utils/accessibility.js — reglas de ruta accesible (silla de ruedas, movilidad reducida).
// Atributos por tramo en caminos.json / API /api/geo (ver docs/mapping/geo-data.md):
//   escaleras (bool), rampa (bool), pendiente_pct (número), superficie, ancho_m (número).

export const ACCESSIBILITY_RULES = Object.freeze({
  // Pendiente máxima recomendada para rampas (NOM-034 / ADA ≈ 8.33 %); más de 12 % se considera intransitable.
  maxComfortSlopePct: 8,
  maxSlopePct: 12,
  difficultFactor: 3,
  roughSurfaceFactor: 1.5,
  roughSurfaces: ['tierra', 'pasto', 'grava'],
  minWidthM: 0.9,
});

const KNOWN_KEYS = ['escaleras', 'rampa', 'pendiente_pct', 'superficie', 'ancho_m'];

/**
 * Clasifica un tramo según sus atributos.
 * @param {object | undefined} attrs
 * @returns {'accessible' | 'difficult' | 'blocked' | 'unknown'}
 */
export function classifyEdge(attrs) {
  if (!attrs || !KNOWN_KEYS.some((key) => attrs[key] !== undefined && attrs[key] !== null)) {
    return 'unknown';
  }
  const rules = ACCESSIBILITY_RULES;
  if (attrs.escaleras === true && attrs.rampa !== true) return 'blocked';
  if (typeof attrs.pendiente_pct === 'number' && attrs.pendiente_pct > rules.maxSlopePct) return 'blocked';
  if (typeof attrs.ancho_m === 'number' && attrs.ancho_m < rules.minWidthM) return 'blocked';
  if (typeof attrs.pendiente_pct === 'number' && attrs.pendiente_pct > rules.maxComfortSlopePct) return 'difficult';
  if (rules.roughSurfaces.includes(attrs.superficie)) return 'difficult';
  return 'accessible';
}

/**
 * Costo de un tramo en modo accesible: Infinity si está bloqueado, mayor si es difícil.
 * Los tramos sin datos conservan su costo (no se puede afirmar que sean inaccesibles).
 */
export function accessibleEdgeCost(attrs, baseCost) {
  const status = classifyEdge(attrs);
  if (status === 'blocked') return Infinity;
  if (status === 'difficult') {
    const rough = ACCESSIBILITY_RULES.roughSurfaces.includes(attrs?.superficie);
    const steep = typeof attrs?.pendiente_pct === 'number' && attrs.pendiente_pct > ACCESSIBILITY_RULES.maxComfortSlopePct;
    return baseCost * (steep ? ACCESSIBILITY_RULES.difficultFactor : 1) * (rough ? ACCESSIBILITY_RULES.roughSurfaceFactor : 1);
  }
  return baseCost;
}

/** Clave no dirigida de un tramo entre dos nodos. */
export const edgeKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/**
 * Resume la accesibilidad de una ruta (lista de ids de nodos).
 * @returns {{ accessible: number, difficult: number, blocked: number, unknown: number, total: number }}
 */
export function summarizePathAccessibility(nodePath, edgeAttributes = {}) {
  const summary = { accessible: 0, difficult: 0, blocked: 0, unknown: 0, total: 0 };
  for (let i = 0; i < nodePath.length - 1; i += 1) {
    summary[classifyEdge(edgeAttributes[edgeKey(nodePath[i], nodePath[i + 1])])] += 1;
    summary.total += 1;
  }
  return summary;
}
