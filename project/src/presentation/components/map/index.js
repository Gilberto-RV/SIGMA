/**
 * Punto de entrada unificado para <SigmaMap />.
 *
 * `./SigmaMap` se resuelve por extensión de plataforma en Metro:
 *   - web           -> SigmaMap.web.js    (MapLibre GL JS)
 *   - android / ios -> SigmaMap.native.js (MapLibre React Native)
 */
import { SigmaMap } from './SigmaMap';

export { SigmaMap };
export {
  SIGMA_MAP_DEFAULT_PROPS,
  SIGMA_MAP_COLORS,
  SIGMA_CAMPUS_BOUNDS,
  SIGMA_MIN_ZOOM,
  SIGMA_MAX_ZOOM,
} from './SigmaMapContract';
export default SigmaMap;
