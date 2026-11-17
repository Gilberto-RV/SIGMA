// Metro resuelve este archivo en Android/iOS. Mantiene maplibre-gl (web) fuera del bundle nativo.
import { SigmaMapNative } from './SigmaMapNative';

export const SigmaMap = SigmaMapNative;
export default SigmaMap;
