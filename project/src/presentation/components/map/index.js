import { Platform } from 'react-native';
import { SigmaMapWeb } from './SigmaMapWeb';
import { SIGMA_MAP_DEFAULT_PROPS } from './SigmaMapContract';

/**
 * Punto de entrada unificado para <SigmaMap />.
 * Despacha dinámicamente a la implementación según la plataforma.
 */
export const SigmaMap = Platform.OS === 'web' ? SigmaMapWeb : null;

export { SIGMA_MAP_DEFAULT_PROPS } from './SigmaMapContract';
export default SigmaMap;
