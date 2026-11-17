# Configuración e Integración de MapLibre React Native para Android (Etapa 3)

Este documento detalla la preparación, arquitectura e instalación de **MapLibre React Native** (`@maplibre/maplibre-react-native`) en la aplicación móvil de **SIGMA (Innova2026)**.

---

## 1. Especificaciones de Versión y Entorno

- **Expo SDK:** `54.0.0`
- **React Native:** `0.81.5`
- **React:** `19.1.0`
- **Expo Router:** `~6.0.24`
- **@maplibre/maplibre-react-native:** `^11.3.7`
- **Nueva Arquitectura:** Habilitada (`"newArchEnabled": true` en `project/app.json`).
- **Flujo de Trabajo (Workflow):** Expo Managed / Prebuild con Expo Config Plugin.

---

## 2. Configuración de Plugins en Expo (`app.json`)

Se integró automáticamente el Config Plugin oficial de MapLibre React Native en [`project/app.json`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/app.json):

```json
{
  "expo": {
    "name": "Instituto Mini-Mapa",
    "slug": "instituto-mini-mapa",
    "version": "1.0.0",
    "newArchEnabled": true,
    "plugins": [
      "expo-router",
      "expo-font",
      "expo-web-browser",
      "expo-location",
      [
        "expo-build-properties",
        {
          "android": {
            "usesCleartextTraffic": true
          }
        }
      ],
      "expo-asset",
      "@maplibre/maplibre-react-native"
    ]
  }
}
```

El plugin se encarga de inyectar las dependencias nativas de Gradle para Android (`com.maplibre.navigation`, permisos de red y binarios nativos C++) al generar el ejecutable.

---

## 3. Pantalla de Prueba Aislada (`app/maplibre-native-test.js`)

Ubicada en [`project/app/maplibre-native-test.js`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/app/maplibre-native-test.js), accesible a través de la ruta `/maplibre-native-test`:

1. **Aislamiento Multiplataforma:**
   - En **Web (`Platform.OS === 'web'`)**: Muestra una interfaz adaptada informando que la librería requiere binarios C++/Java para Android/iOS, ofreciendo acceso directo al visor Web GL (`/maplibre-test`).
   - En **Android / iOS (`Platform.OS !== 'web'`)**: Carga e instancia dinámicamente `Map` / `MapView` de `@maplibre/maplibre-react-native` utilizando el estilo de prueba público `https://demotiles.maplibre.org/style.json`.

---

## 4. Procedimiento para Generar y Probar Development Build en Android

Dado que `@maplibre/maplibre-react-native` contiene código nativo en C++ y Java (JNI/NDK), **no es compatible con el cliente estándar de Expo Go**. Se requiere un **Development Build** nativo de Android.

### Requisitos Previos:
- Android Studio / Android SDK instalado en la máquina de desarrollo.
- Un dispositivo Android físico (con depuración USB activada) o un Emulador Android (AVD) en ejecución.

### Pasos para Ejecutar en Android:

```bash
# 1. Posicionarse en la carpeta de la aplicación móvil
cd project

# 2. Generar el código nativo de Android y compilar el Development Build
npx expo run:android
```

Al ejecutar `npx expo run:android`, Expo realizará automáticamente:
1. `npx expo prebuild` (generará la carpeta nativa `project/android/` aplicando el plugin de MapLibre).
2. Compilación de los binarios nativos vía Gradle.
3. Instalación de la aplicación de desarrollo en el dispositivo/emulador.
4. Conexión del servidor Metro bundler para hot reloading.

Una vez iniciada la app en Android, se puede navegar hacia la ruta `/maplibre-native-test` para verificar la inicialización del mapa nativo.

---

## 5. Validaciones de Regresión Realizadas

1. **Web Build Export (`npm run build:web`):** Ejecutado exitosamente con código `0`. Cero regresiones en la compilación y empaquetado para navegador.
2. **Aislamiento Web:** La ruta `/maplibre-test` de MapLibre GL JS Web se mantiene 100% funcional sin interferencias de las llamadas a módulos nativos de Android.

---

## 6. Integración en la Pantalla Principal (Etapa 3B — 17-nov-2026)

La pantalla principal [`app/(main)/index.js`](../../project/app/(main)/index.js) ya **no usa `react-native-maps` ni Google Maps**. Web y Android renderizan el mismo componente `<SigmaMap />`:

```
src/presentation/components/map/
├── SigmaMapContract.js   # Props, constantes compartidas (límites, zoom, colores)
├── SigmaMap.web.js       # Metro (web)      -> SigmaMapWeb   (maplibre-gl)
├── SigmaMap.native.js    # Metro (android)  -> SigmaMapNative (@maplibre/maplibre-react-native v11)
├── SigmaMapWeb.jsx
├── SigmaMapNative.jsx
└── index.js              # export { SigmaMap }
```

Metro elige el archivo por extensión de plataforma, así que `maplibre-gl` nunca entra al bundle de Android y el módulo nativo nunca entra al bundle web.

### `SigmaMapNative` (MapLibre React Native v11)
- `Map` + `Camera` con `maxBounds` del campus y zoom entre 15 y 20.
- Capas GeoJSON equivalentes a web: perímetro, caminos, edificios (relleno + borde con resaltado del seleccionado mediante expresión `['==', ['get','id'], selectedId]`), entradas y ruta activa (aura + línea discontinua).
- Pines de edificios (`Marker`) con el ícono `School`, nombre al seleccionar, y marcador propio para el usuario simulado; `NativeUserLocation` cuando la ubicación es real.
- Toques: `GeoJSONSource.onPress` sobre edificios (con `stopPropagation`) y `Map.onPress` para cerrar el panel.
- API imperativa común con web: `ref.current.flyTo({ center: [lng, lat], zoom, duration })`.

### Estilo base y API key en Android
- Si existe `EXPO_PUBLIC_MAPTILER_API_KEY` se usa MapTiler `streets-v2`.
- Las peticiones nativas **no envían `Referer`**; una clave restringida por origen (p. ej. `localhost:8081`) responde 403 en Android. En ese caso, o si no hay clave, `SigmaMapNative` cambia automáticamente al estilo libre **OpenFreeMap Liberty** (`https://tiles.openfreemap.org/styles/liberty`, datos OSM, sin clave).
- Para usar MapTiler en Android, crea en MapTiler Cloud una clave para la app móvil sin restricción por Referer.

### Datos GeoJSON inyectados
`DijkstraRoutingService` y `CampusAccessService` ya no cargan los GeoJSON con `createRequire` de Node (rompía el bundle de Android con `Unable to resolve module module` y dejaba el grafo vacío en web). Ahora:
- La app los inyecta en [`ServiceContainer.js`](../../project/src/infrastructure/di/ServiceContainer.js).
- Las pruebas en Node los cargan con [`campusGeoFixtures.node.js`](../../project/src/core/services/campusGeoFixtures.node.js).

### Una sola copia del módulo nativo
Importar `@maplibre/maplibre-react-native` siempre con `import` (ESM). Con `require`, Metro resuelve `lib/commonjs` en lugar de `lib/module`, la librería se evalúa dos veces y falla con `Tried to register two views with the same name MLRNCamera`. Fuera de `SigmaMapNative`, usar [`maplibreNative.native.js`](../../project/src/presentation/components/map/maplibreNative.native.js) (en web resuelve a `maplibreNative.web.js`, que exporta `null`).

### Compilar y probar en Android
```bash
cd project
npx expo prebuild --platform android --clean   # regenera android/ (ignorado en git)
npx expo run:android                           # requiere JDK 17 y Android SDK (API 36, NDK 27.1)
```

### Validación en emulador (17-nov-2026)
- `gradlew assembleDebug` compiló el APK (incluye `libmaplibre.so`).
- Emulador Android 35 **sin Google Play Services** (imagen `default;x86_64`): el mapa base OSM, los 13 edificios, pines, entradas, perímetro, selección de edificio, panel de detalle, ruta híbrida y el indicador de ubicación nativo funcionan.
- En el emulador (render por software SwiftShader) las capas con `line-dasharray` no se dibujaban de forma fiable. Por eso la línea principal de la ruta es continua en nativo; el perímetro sigue discontinuo (solo estético). Conviene confirmarlo en un teléfono real.
- Si Metro no detecta cambios dentro de OneDrive, reinícialo con `npx expo start --clear`.
