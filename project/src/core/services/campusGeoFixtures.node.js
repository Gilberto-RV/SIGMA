// Solo para las pruebas en Node (`node src/core/services/*.test.js`).
// Carga los GeoJSON reales del campus con createRequire; la app los inyecta desde ServiceContainer.
// No importar este archivo desde código de la app: `module` no existe en Metro/React Native.
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export const campusGeo = {
  entradas: require('../../../assets/geo/Entradas.json'),
  caminos: require('../../../assets/geo/caminos.json'),
  edificios: require('../../../assets/geo/Edificios.json'),
  perimetro: require('../../../assets/geo/PerimetroCampus.json'),
};

export const campusAccessServiceOptions = {
  geoJsonEntradas: campusGeo.entradas,
  geoJsonCaminos: campusGeo.caminos,
  geoJsonEdificios: campusGeo.edificios,
  geoJsonPerimetro: campusGeo.perimetro,
};

export const dijkstraRoutingServiceOptions = {
  geoJsonFeatures: [...campusGeo.entradas.features, ...campusGeo.caminos.features],
};
