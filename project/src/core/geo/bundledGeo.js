// src/core/geo/bundledGeo.js — GeoJSON empaquetados en la app (respaldo sin conexión).
// Solo para código que empaqueta Metro: Node no importa JSON sin atributos de importación.
import edificios from '../../../assets/geo/Edificios.json';
import caminos from '../../../assets/geo/caminos.json';
import entradas from '../../../assets/geo/Entradas.json';
import perimetro from '../../../assets/geo/PerimetroCampus.json';

export const BUNDLED_GEO = Object.freeze({
  buildings: edificios,
  paths: caminos,
  entrances: entradas,
  perimeter: perimetro,
});

export default BUNDLED_GEO;
