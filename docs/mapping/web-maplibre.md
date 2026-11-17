# Capa Geoespacial y Primer Visor Web con MapLibre GL JS — SIGMA (Etapa 2)

Este documento describe la arquitectura, implementación técnica y validación del primer visor web independiente basado en **MapLibre GL JS**, **MapTiler** y el modelo **GeoJSON** en el proyecto **SIGMA (Innova2026)**.

---

## 1. Dependencia MapLibre Web

- **Paquete instalado:** `maplibre-gl`
- **Versión instalada:** `^6.6.0` (instalada en `project/package.json`).
- **Naturaleza del paquete:** Motor de renderizado cartográfico acelerado por hardware (WebGL / WebGPU) de código abierto.
- **Ámbito:** Exclusivo para la capa Web de la aplicación. No se instaló `@maplibre/maplibre-react-native` ni librerías de routing en esta etapa.

---

## 2. Bundler y Configuración de Renderizado

- **Bundler Web:** **Metro Bundler for Web** (`expo/metro-config` configurado en `project/app.json: "web": { "bundler": "metro" }`).
- **Gestión de Estilos CSS:** Se importa la hoja de estilos oficial `maplibre-gl/dist/maplibre-gl.css` en el componente Web (`SigmaMapWeb.jsx`), la cual es procesada e inyectada limpiamente por Metro durante el bundling sin requerir plugins externos ni emulaciones.
- **Aislamiento de la Web:** `project/metro.config.js` mantiene su interceptor para redirigir `react-native-maps` nativo en web, permitiendo que `SigmaMapWeb` opere de forma totalmente paralela y sin conflictos.

---

## 3. Variables de Entorno y Metro Web

Es fundamental mantener la estricta separación de convenciones de variables de entorno entre las dos aplicaciones del ecosistema:

| Entorno | Bundler | Variable Cartográfica | Acceso en Código | Archivo Local |
| :--- | :--- | :--- | :--- | :--- |
| **SIGMA (Móvil & Web)** | Metro (`expo`) | `EXPO_PUBLIC_MAPTILER_API_KEY` | `process.env.EXPO_PUBLIC_MAPTILER_API_KEY` | `project/.env.local` |
| **Gestory (Panel Web)** | Vite (`vite`) | `VITE_MAPTILER_API_KEY` | `import.meta.env.VITE_MAPTILER_API_KEY` | `gestory/project/.env.local` |

### ¿Por qué NO deben intercambiarse?
- **Metro Web** empaqueta los módulos JavaScript en formato estándar IIFE / CommonJS / Hermes Bytecode para la web. La sintaxis `import.meta` es exclusiva de módulos ES nativos del navegador (`<script type="module">`) y genera un error fatal de parseo (`Uncaught SyntaxError: import.meta may only appear in a module`) si se utiliza dentro de código empaquetado por Metro sin transformación AST.
- **Vite** requiere estrictamente el prefijo `VITE_` e inyecta variables estáticamente en `import.meta.env`.
- Por tanto, SIGMA Web bajo Metro consume su clave única y exclusivamente mediante la utilidad [`project/src/core/config/mapConfig.js`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/src/core/config/mapConfig.js) usando `process.env.EXPO_PUBLIC_MAPTILER_API_KEY`.

---

## 4. Arquitectura del Contrato `SigmaMap`

Se estableció un contrato desacoplado e independiente de la librería de renderizado subyacente:

```
project/src/presentation/components/map/
├── SigmaMapContract.js       # Contrato de tipos y props por defecto
├── SigmaMapWeb.jsx           # Implementación Web con MapLibre GL JS
└── index.js                  # Punto de entrada y resolución por plataforma
```

### Propiedades Soportadas por el Contrato (`SigmaMapProps`):
- `initialCenter`: Coordenada inicial `{ latitude, longitude }` (por defecto el centro del campus `19.4074, -98.1198`).
- `initialZoom`: Nivel de zoom inicial (escala MapLibre 0-22, por defecto `17`).
- `buildings`: FeatureCollection GeoJSON de los edificios (`Edificios.json`).
- `paths`: FeatureCollection GeoJSON de los caminos peatonales (`caminos.json`).
- `entrances`: FeatureCollection GeoJSON de las entradas y cruces (`Entradas.json`).
- `campusBoundary`: FeatureCollection GeoJSON del perímetro del campus (`PerimetroCampus.json`).
- `selectedBuilding`: ID o entidad del edificio seleccionado para resaltado dinámico.
- `onBuildingPress`: Callback ejecutado al hacer clic sobre un edificio.
- `onMapPress`: Callback ejecutado al hacer clic en un área libre del mapa.
- `interactive`: Booleano para activar/desactivar controles de navegación y gestos.

---

## 5. Capa de Adaptación de Coordenadas (`geoAdapters.js`)

Ubicada en [`project/src/core/utils/geoAdapters.js`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/src/core/utils/geoAdapters.js).

Provee funciones puras sin dependencias de UI para la conversión bidireccional segura:
- `coordinateToGeoJSON({ latitude, longitude })` ➔ `[longitude, latitude]`
- `geoJSONToCoordinate([longitude, latitude])` ➔ `{ latitude, longitude }`
- `coordinatesToGeoJSON(coordsArray)` ➔ `[[lng, lat], ...]`
- `geoJSONToCoordinates(positionsArray)` ➔ `[{ latitude, longitude }, ...]`
- `featureToPoint(coord, properties, id)` ➔ GeoJSON Feature (Point)
- `featureToLineString(points, properties, id)` ➔ GeoJSON Feature (LineString)
- `featureToPolygon(ring, properties, id)` ➔ GeoJSON Feature (Polygon cerrado)
- `isValidCoordinate(coord)` y `isValidGeoJSONPosition(position)` para validación estricta de límites geográficos (-90 a 90 latitud, -180 a 180 longitud).

---

## 6. Entidades de Dominio Geoespacial (`src/core/entities/geo/`)

Modelos ligeros que encapsulan la semántica de los objetos sin duplicar geometrías GeoJSON:
- `BuildingGeo`: ID, nombre, tipo, conexiones y centroide calculado.
- `EntranceGeo`: ID, nombre, tipo, edificio asociado y coordenada del punto de acceso.
- `PathGeo`: ID, tipo, nodo origen (`from`), nodo destino (`to`) y distancia en metros.
- `CampusBoundaryGeo`: Conteo de vértices y referencia del polígono perimetral.

---

## 7. Configuración de MapTiler y Fuentes GeoJSON

- **Estilo Base:** Vector Tiles de MapTiler (`https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}`).
- **Restricción Espacial (Bounds):** Delimitado estrictamente al cuadrante del campus `[[-98.1255, 19.4045], [-98.1160, 19.4125]]` con niveles de zoom entre 15 y 20.
- **Capas Superpuestas en MapLibre:**
  1. `campus-perimeter-line`: Trazo cian discontinuo `[3, 2]` de 2.5px.
  2. `campus-paths-line`: Senderos peatonales grises de 3.5px con 85% de opacidad.
  3. `campus-buildings-fill`: Polígonos de edificios con color base `#043c55` y resaltado dinámico `#0284c7` vía `feature-state` (`selected`).
  4. `campus-buildings-outline`: Borde exterior de edificios con grosor condicional.
  5. `campus-entrances-circle`: Círculos verdes `#10b981` de 4.5px con borde blanco para identificar accesos.

---

## 8. Ruta Aislada de Pruebas

Se creó la pantalla [`project/app/maplibre-test.js`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/app/maplibre-test.js) accesible en `/maplibre-test`.
- Renderiza `SigmaMapWeb` pasando los 4 GeoJSONs reales de SIGMA.
- Permite seleccionar cualquier edificio haciendo clic sobre él, actualizando el panel flotante y disparando `setFeatureState` en MapLibre.
- Muestra el estado de la API Key validada por `mapConfig.js`.

---

## 9. Validaciones Realizadas

1. **Tests Unitarios de Adaptadores:** [`project/src/core/utils/geoAdapters.test.js`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/src/core/utils/geoAdapters.test.js) ejecutado exitosamente con Node.js (`100% de aserciones pasadas`).
2. **Build Web (Export de Producción):** `npx expo export --platform web` completado con código `0`, empaquetando el bundle JS y el CSS de MapLibre GL sin errores.
3. **Servidor de Desarrollo:** `expo start --web` iniciado y respondiendo con HTTP `200 OK` en `/maplibre-test`.
4. **Validación de Cero Google Maps:** Se verificó que el visor MapLibre Web no realiza peticiones a los servicios de Google Maps.
5. **Verificación de Sintaxis JavaScript de Bundling:** Se verificó la eliminación de toda sintaxis `import.meta` en código activo de Metro Web, garantizando compatibilidad con navegadores modernos (Firefox, Chrome, Safari).

---

## 10. Limitaciones Actuales y Alcance para Siguientes Etapas

- **No implementado en esta etapa:** Routing OSRM, geolocalización continua GPS en tiempo real en Web, edificios 3D extruidos, implementación nativa Android con `@maplibre/maplibre-react-native`.
- La pantalla principal de producción `app/(main)/index.js` permanece intacta con `react-native-maps` para Android hasta la Etapa correspondiente.

