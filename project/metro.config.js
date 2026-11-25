const { getDefaultConfig } = require('expo/metro-config');

// Configuración por defecto de Expo. El resolver que redirigía react-native-maps a un shim web
// ya no hace falta: el mapa es MapLibre en todas las plataformas (SigmaMap.web / SigmaMap.native).
module.exports = getDefaultConfig(__dirname);
