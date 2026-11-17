// Único punto de acceso a @maplibre/maplibre-react-native fuera de SigmaMapNative.
// Usar siempre `import` (no `require`): Metro resuelve `require` a lib/commonjs e `import` a
// lib/module; con ambos la librería se evalúa dos veces y falla con
// "Tried to register two views with the same name MLRNCamera".
export { Map } from '@maplibre/maplibre-react-native';
