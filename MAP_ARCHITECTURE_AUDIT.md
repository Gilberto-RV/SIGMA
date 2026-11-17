# Auditoría de Arquitectura Cartográfica y Plan de Migración — SIGMA (Innova2026)

> **Fecha de auditoría:** 30 de Agosto de 2026  
> **Sistema auditado:** Ecosistema SIGMA / Innova2026 (Campus Modular Inteligente)  
> **Objetivo:** Evaluación exhaustiva de componentes geoespaciales actuales y diseño de la estrategia de migración progresiva hacia **OpenStreetMap**, **MapLibre**, **MapTiler**, **OSRM** y **GeoJSON**.

---

## 1. Estado Actual del Sistema

El ecosistema **SIGMA (Innova2026)** es un monorepositorio compuesto por tres subsistemas principales interconectados:

```
Innova2026/
├── project/             # Aplicación Móvil (React Native + Expo Router) con soporte Web
├── gestory/project/     # Panel Web Administrativo (React + Vite + Sass)
└── backend/             # API REST (Node.js/Express) + Microservicio ML (Python/FastAPI) + MongoDB Atlas
```

### Diagnóstico General del Módulo Cartográfico
1. **Aplicación Móvil (`project/`):**
   - La visualización y renderizado cartográfico nativo depende exclusivamente del componente `MapView` de `react-native-maps` configurado con `provider={PROVIDER_GOOGLE}` ([`project/app/(main)/index.js:4, 521`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/app/%28main%29/index.js#L4-L521)).
   - **En Web (`project/`):** La visualización nativa de mapas está **inhabilitada**. A través de la configuración de Metro ([`project/metro.config.js:6-14`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/metro.config.js#L6-L14)), cualquier invocación a `react-native-maps` es interceptada y redirigida a un shim simulado ([`project/src/core/shims/react-native-maps.web.js`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/src/core/shims/react-native-maps.web.js)) que renderiza un mensaje estático: `🗺️ Mapa disponible en app móvil (Android / iOS)`.
   - Existen dependencias no utilizadas en producción para `leaflet` y `react-leaflet` en [`project/package.json:41, 45`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/package.json#L41-L45).
2. **Cálculo de Rutas y Navegación:**
   - **No existe dependencia de Google Directions API ni de servicios externos de routing.**
   - El enrutamiento dentro del campus se realiza **completamente en el cliente móvil** mediante un algoritmo propio de Dijkstra implementado en JavaScript ([`project/src/core/utils/graphUtils.js:90-156`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/src/core/utils/graphUtils.js#L90-L156)), alimentado por archivos locales GeoJSON modulares de caminos y entradas.
3. **Geolocalización y Geocodificación:**
   - La captura de posición satelital del usuario se efectúa mediante `expo-location` ([`project/app/(main)/index.js:5, 206-271`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/app/%28main%29/index.js#L5-L271)).
   - La detección de presencia dentro del campus (Geofencing) se realiza matemáticamente en local mediante un algoritmo de Ray-Casting (`isPointInPolygon`, [`project/app/(main)/index.js:188-204`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/app/%28main%29/index.js#L188-L204)) contra el polígono perimetral de [`project/assets/geo/PerimetroCampus.json`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/assets/geo/PerimetroCampus.json).
   - No hay uso de Google Places API ni Google Geocoding API; las búsquedas de edificios son consultas textuales locales sobre el catálogo de MongoDB.
4. **Panel Web Gestory (`gestory/project/`):**
   - Actualmente **no implementa un visor cartográfico visual interactivo**. Funciona como panel de administración CRUD para edificios, servicios y eventos ([`gestory/project/src/ui/components/forms/BuildingForm.jsx`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/gestory/project/src/ui/components/forms/BuildingForm.jsx)), y visor analítico (Big Data y ML).

---

## 2. Dependencias Cartográficas

### 2.1 Aplicación Móvil (`project/package.json`)

| Dependencia | Versión | Tipo | Estado / Uso |
| :--- | :--- | :--- | :--- |
| `react-native-maps` | `1.20.1` | Directa | **En uso activo** en Android nativo. Interceptada en Web mediante shim. |
| `expo-location` | `~19.0.8` | Directa | **En uso activo** para captura GPS, suscripción continua y geofencing. |
| `leaflet` | `^1.9.4` | Directa | **Instalada / No usada** en el código fuente. |
| `react-leaflet` | `^5.0.0` | Directa | **Instalada / No usada** en el código fuente. |
| `@types/geojson` | `^7946.0.16` | Transitiva | Tipados TypeScript para estructuras GeoJSON. |
| `react-native-svg` | `15.12.1` | Directa | Utilizada para renderizado de íconos vectoriales (`lucide-react-native`). |
| `react-native-webview` | `13.15.0` | Directa | Instalada en proyecto (potencial puente para visores web). |

### 2.2 Frameworks y Entornos de Ejecución

- **App Móvil:**
  - Expo SDK: `^54.0.0`
  - React Native: `0.81.5`
  - React / React-DOM: `19.1.0`
  - Expo Router: `~6.0.24`
  - React Native Web: `^0.21.0`
  - Nueva Arquitectura: `newArchEnabled: true` en [`project/app.json:10`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/app.json#L10).
- **Panel Web Administrativo:**
  - Bundler: Vite `^5.4.2`
  - React / React-DOM: `^18.3.1`
  - React Router DOM: `^7.8.0`
  - Estilos: Sass `^1.90.0`
  - Gráficos: Recharts `^2.10.3`
- **Backend y Microservicios:**
  - Node.js / Express: `^5.1.0`
  - ODM: Mongoose `^8.16.5`
  - Microservicio ML: Python 3.10+, FastAPI, Scikit-learn, LightGBM, PyMongo.

---

## 3. Archivos Afectados por la Cartografía

```
Innova2026/
├── project/
│   ├── app/
│   │   ├── (main)/
│   │   │   └── index.js                           # [PRINCIPAL] Pantalla del mapa, renderizado MapView, marcadores, polígonos, rutas, GPS y simulación
│   │   ├── _layout.js                             # Configuración de fuentes Roboto
│   │   └── (main)/_layout.js                      # Drawer navigator con acceso al Mapa
│   ├── assets/
│   │   └── geo/
│   │       ├── Edificios.json                     # GeoJSON: Polígonos y centros de los 13 edificios
│   │       ├── Entradas.json                      # GeoJSON: Puntos de acceso a edificios y campus
│   │       ├── caminos.json                       # GeoJSON: Red de nodos y aristas (LineStrings y Cruces)
│   │       ├── PerimetroCampus.json               # GeoJSON: Polígono cerrado del perímetro del campus
│   │       └── Legacy/
│   │           ├── CaminoV6.geojson               # Archivo GeoJSON histórico consolidado
│   │           └── CaminoV6.json                  # Archivo JSON histórico consolidado
│   ├── metro.config.js                            # Hook de resolución que redirige react-native-maps a shim web
│   ├── app.json                                   # Configuración de permisos de ubicación y plugins de Expo
│   ├── package.json                               # Declaración de dependencias react-native-maps, expo-location, leaflet
│   └── src/
│       ├── core/
│       │   ├── entities/
│       │   │   └── Building.js                    # Entidad de dominio Edificio con coordenadas y entradas
│       │   ├── repositories/
│       │   │   └── BuildingRepository.js          # Interfaz abstracta del repositorio de edificios
│       │   ├── shims/
│       │   │   └── react-native-maps.web.js       # Shim Web de react-native-maps
│       │   ├── usecases/
│       │   │   └── BuildingUseCases.js            # Casos de uso de edificios y cálculo de distancia Haversine
│       │   └── utils/
│       │       └── graphUtils.js                  # Algoritmo de grafo y Dijkstra para navegación interna
│       ├── infrastructure/
│       │   └── repositories/
│       │       └── HttpBuildingRepository.js      # Consumo API de edificios y caché offline AsyncStorage
│       └── presentation/
│           └── components/
│               ├── BuildingInfoPanel.js           # Panel deslizante de detalle de edificio
│               ├── EventsCarousel.js              # Carrusel de eventos vinculado a botones "¿Cómo llegar?"
│               ├── FilterModal.js                 # Modal de filtros de accesibilidad
│               ├── MapHeader.js                   # Encabezado visual sobre el mapa
│               └── SearchBar.js                   # Barra de búsqueda contextual de edificios
├── backend/
│   ├── models/
│   │   └── Building.js                            # Esquema Mongoose con entradas, coordenadas y atributos
│   ├── controllers/
│   │   └── building/
│   │       ├── getAllBuildingsController.js       # Endpoint GET /api/buildings
│   │       ├── getBuildingByIdController.js       # Endpoint GET /api/buildings/:id
│   │       └── updateBuildingController.js        # Endpoint PUT /api/buildings/:id
│   ├── scripts/
│   │   ├── loadBuildingsModular.js                # Ingesta de Edificios.json y Entradas.json hacia MongoDB
│   │   ├── loadBuildingsFromGeoJSON.js            # Ingesta histórica desde caminos.json
│   │   └── cleanAndSetup13Buildings.js            # Limpieza y preparación de los 13 edificios base
│   └── ml-service/
│       └── data_extractor_updated.py              # Ingesta de Edificios.json, Caminos.json y Entradas.json para ML
└── gestory/project/
    └── src/
        └── ui/
            ├── components/forms/
            │   └── BuildingForm.jsx               # Formulario web de edición de edificios
            └── pages/
                └── EdificiosPage.jsx              # Gestión administrativa de edificios
```

---

## 4. Funcionalidades Geoespaciales Actuales

1. **Renderizado de Mapa Base y Capas Vectoriales:**
   - Visualización satelital/vectorial de Google Maps en Android vía `MapView` ([`project/app/(main)/index.js:518-537`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/app/%28main%29/index.js#L518-L537)).
   - Restricción de límites de cámara (Camera Bounding Box) entre `lat: [19.4045, 19.4125]` y `lng: [-98.1255, -98.1160]` ([`project/app/(main)/index.js:531-534`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/app/%28main%29/index.js#L531-L534)).
   - Rango de zoom limitado (`minZoomLevel={15}`, `maxZoomLevel={20}`).
2. **Representación de Polígonos de Edificios:**
   - Renderizado dinámico con `<Polygon>` de los 13 edificios campus ([`project/app/(main)/index.js:549-560`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/app/%28main%29/index.js#L549-L560)) a partir de las geometrías de [`project/assets/geo/Edificios.json`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/assets/geo/Edificios.json).
   - Resaltado interactivo al seleccionar un edificio (cambio de color de relleno y grosor de trazo con soporte para tema claro/oscuro).
3. **Red de Caminos Peatonales:**
   - Trazo de la red de senderos peatonales mediante `<Polyline>` ([`project/app/(main)/index.js:563-570`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/app/%28main%29/index.js#L563-L570)) a partir de [`project/assets/geo/caminos.json`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/assets/geo/caminos.json).
4. **Perímetro del Plantel:**
   - Trazo discontinuo delimitador del campus mediante `<Polyline>` ([`project/app/(main)/index.js:539-546`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/app/%28main%29/index.js#L539-L546)) extraído de [`project/assets/geo/PerimetroCampus.json`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/assets/geo/PerimetroCampus.json).
5. **Marcadores Interactivos de Edificios (Markers):**
   - Pines personalizados con íconos de la librería `lucide-react-native` (`School`) y badge dinámico animado ([`project/app/(main)/index.js:573-606`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/app/%28main%29/index.js#L573-L606)).
   - Optimización de renderizado mediante `tracksViewChanges={isSelected}`.
6. **Enrutamiento Interno (Routing):**
   - Cálculo automático de ruta óptima desde la posición actual del usuario hasta la entrada del edificio de destino (`calculateAndSetRoute`, [`project/app/(main)/index.js:297-349`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/app/%28main%29/index.js#L297-L349)).
   - Conexión del punto GPS inicial al nodo de red más cercano (`findNearestNode`, [`project/src/core/utils/graphUtils.js:63-88`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/src/core/utils/graphUtils.js#L63-L88)).
   - Trazado de ruta activa con efecto visual de neón de doble capa (trazo base translúcido de 11px + trazo frontal discontinuo de 5.5px) ([`project/app/(main)/index.js:609-625`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/app/%28main%29/index.js#L609-L625)).
7. **Geolocalización en Tiempo Real y Geofencing:**
   - Seguimiento continuo de la posición del usuario con `Location.watchPositionAsync` ([`project/app/(main)/index.js:244-262`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/app/%28main%29/index.js#L244-L262)).
   - Comprobación matemática de contención dentro del polígono del campus (`isPointInPolygon`).
   - Modo de simulación: Si el usuario se encuentra fuera del plantel, se sitúa automáticamente en la Entrada Principal (`EP-003`, `19.40719130839912, -98.12107448617152`) con un marcador especial pulsante ([`project/app/(main)/index.js:628-641`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/app/%28main%29/index.js#L628-L641)).
8. **Atajos Rápidos y Navegación a Eventos:**
   - Atajos directos a Biblioteca (`E-12`/`E-13`), Cafetería (`E-18`), Baños y Entrada Principal ([`project/app/(main)/index.js:374-418`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/app/%28main%29/index.js#L374-L418)).
   - Vinculación directa desde el carrusel de eventos para trazar la ruta hacia el edificio donde se celebra el evento (`handleRouteToEvent`, [`project/app/(main)/index.js:434-463`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/app/%28main%29/index.js#L434-L463)).
9. **Modo Accesibilidad / Ruta Inclusiva:**
   - Interruptor de accesibilidad (`toggleAccessibilityShortcut`, [`project/app/(main)/index.js:420-432`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/app/%28main%29/index.js#L420-L432)).

---

## 5. Dependencias Directas de Google

Al realizar la auditoría a nivel de código y configuración, se determinó con precisión el grado real de dependencia de servicios de Google:

1. **Renderizador de Mapas en Android:**
   - En [`project/app/(main)/index.js:4, 521`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/app/%28main%29/index.js#L4-L521): Se importa y utiliza la constante `PROVIDER_GOOGLE` de `react-native-maps`.
   - **Hallazgo Crítico:** En [`project/app.json`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/app.json) **NO existe ninguna Google Maps API Key configurada** (propiedad `android.config.googleMaps.apiKey` ausente). En Android nativo sin clave registrada, el componente depende de los servicios de desarrollo de Expo o de Google Play Services instalados en el dispositivo.
2. **Servicios Web de Google (Cloud APIs):**
   - **Directions API:** **0 dependencias.** Ninguna llamada a `maps.googleapis.com/maps/api/directions`.
   - **Geocoding API:** **0 dependencias.** Ninguna llamada a `maps.googleapis.com/maps/api/geocode`.
   - **Places API:** **0 dependencias.** Ninguna llamada a `maps.googleapis.com/maps/api/place`.
   - **Elevation / Static Maps API:** **0 dependencias.**
3. **Otras dependencias auxiliares de Google en el repositorio:**
   - **Google Fonts:** `@expo-google-fonts/roboto` ([`project/package.json:15`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/package.json#L15), [`project/app/_layout.js:5`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/app/_layout.js#L5)) para la tipografía Roboto en móvil. No afecta la cartografía.
   - **Google OAuth:** `passport-google-oauth20` ([`backend/package.json:40`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/backend/package.json#L40), [`backend/config/passport.js:3-11`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/backend/config/passport.js#L3-L11)) para inicio de sesión federado opcional en el backend. No afecta la cartografía.

---

## 6. Dependencias Indirectas

1. **Google Play Services en dispositivos Android:**
   - El renderizador `react-native-maps` con `PROVIDER_GOOGLE` delega el renderizado nativo al SDK de Google Maps instalado a través de Google Play Services en el terminal del usuario. En dispositivos sin Google Play Services (e.g. Huawei sin GMS, emuladores AOSP puros), el mapa falla o no renderiza capas.
2. **Acoplamiento al ciclo de vida de `react-native-maps`:**
   - Las llamadas imperativas a la cámara como `mapRef.current.animateToRegion(...)` ([`project/app/(main)/index.js:337, 381, 468`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/app/%28main%29/index.js#L337-L468)) utilizan la firma propia de `react-native-maps` (`latitude`, `longitude`, `latitudeDelta`, `longitudeDelta`), la cual difiere del estándar MapLibre/Mapbox (`center: [lng, lat]`, `zoom`, `pitch`, `bearing`).
3. **Ecosistema Expo con Nueva Arquitectura (`newArchEnabled: true`):**
   - En [`project/app.json:10`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/app.json#L10), la aplicación móvil tiene activada la Nueva Arquitectura de React Native (TurboModules / Fabric). Cualquier librería cartográfica nativa a incorporar debe contar con soporte pleno para la nueva arquitectura.

---

## 7. Riesgos de Migración

| # | Riesgo Identificado | Nivel de Impacto | Severidad | Mitigación Técnica Propuesta |
| :--- | :--- | :--- | :--- | :--- |
| **R1** | **Discrepancia de API entre Android y Web** | Alto | Media | Crear un componente unificado desacoplado (ej. `<SigmaMap />`) con implementaciones platform-specific (`SigmaMap.native.jsx` y `SigmaMap.web.jsx`) que compartan la misma interfaz de props y estado. |
| **R2** | **Soporte de Nueva Arquitectura en Móvil** | Alto | Alta | Utilizar `@maplibre/maplibre-react-native` compatible con Expo SDK 54 y React Native 0.81 (o solución basada en WebView / MapLibre GL Web optimizada como alternativa ultra-estable). |
| **R3** | **Consumo y límites de cuota de MapTiler** | Medio | Baja | Almacenar en caché estilos y vector tiles; restringir las peticiones por origen de dominio/bundle ID y utilizar la capa gratuita de MapTiler Cloud (hasta 100,000 requests/mes). |
| **R4** | **Transición de Dijkstra local hacia OSRM** | Medio | Media | Mantener el motor de grafo local actual como *fallback* offline instantáneo y habilitar OSRM para cálculo de rutas vehiculares/peatonales ampliadas en el exterior del campus. |
| **R5** | **Formato de coordenadas (Lat/Lon vs Lon/Lat)** | Medio | Media | GeoJSON y MapLibre utilizan estrictamente `[longitud, latitud]`, mientras que `react-native-maps` utiliza `{ latitude, longitude }`. Se debe estandarizar un adaptador de coordenadas en `core/utils/geoUtils.js`. |
| **R6** | **Rendimiento de renderizado de capas GeoJSON** | Bajo | Baja | MapLibre procesa fuentes GeoJSON mediante WebGL/GPU en hilos nativos (`addSource` y `addLayer`), lo que superará ampliamente el rendimiento de los componentes `<Polygon>` y `<Polyline>` de React Native. |

---

## 8. Compatibilidad Android

1. **Estado Actual:**
   - Funciona mediante `react-native-maps` nativo invocando Google Maps.
   - Requiere Google Play Services.
2. **Compatibilidad con MapLibre en Android:**
   - **100% compatible.** MapLibre Native renderiza directamente usando OpenGL ES / Vulkan en el hardware del dispositivo móvil sin requerir servicios de Google Play.
   - Funciona en cualquier dispositivo Android (incluyendo Huawei HarmonyOS, AOSP y tablets industriales).
   - Integración con Expo: Se requiere Expo Config Plugin para `@maplibre/maplibre-react-native` en `app.json` cuando se compila mediante EAS Build / `npx expo prebuild`.

---

## 9. Compatibilidad Web

1. **Estado Actual:**
   - **Incompatible en la app móvil web (`project/`):** Deshabilitado intencionalmente mediante shim que muestra un cartel de advertencia ([`project/src/core/shims/react-native-maps.web.js`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/src/core/shims/react-native-maps.web.js)).
   - **Inexistente en el panel Gestory (`gestory/project/`):** No hay mapa implementado.
2. **Compatibilidad con MapLibre GL JS en Web:**
   - **100% compatible y de estándar de la industria.**
   - `maplibre-gl` es una librería ligera, de código abierto, acelerada por WebGL, que renderiza Vector Tiles de MapTiler y capas GeoJSON directamente en navegadores modernos sin coste de licencias.
   - Permite una experiencia visual fluida idéntica tanto en `project` (exportado para Web) como en el panel administrativo `gestory`.

---

## 10. Recomendación de Arquitectura Cartográfica

Se recomienda una arquitectura desacoplada basada en el patrón **Adaptador / Fachada Geoespacial (Geo-Spatial Abstraction Layer)**:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        SIGMA Geo Presentation Layer                      │
│   (BuildingInfoPanel, SearchBar, EventsCarousel, Shortcuts, ThemeContext)│
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 │       <SigmaMapView /> (Unified)       │
                 └─────────┬───────────────────┬─────────┘
                           │                   │
         [Platform: Android/iOS]             [Platform: Web & Gestory]
                           │                   │
         ┌─────────────────┴───────┐   ┌───────┴─────────────────┐
         │  SigmaMapView.native    │   │     SigmaMapView.web    │
         │  (@maplibre/maplibre-rn)│   │     (maplibre-gl JS)    │
         └─────────────────┬───────┘   └───────┬─────────────────┘
                           │                   │
                           └─────────┬─────────┘
                                     │
┌────────────────────────────────────┴─────────────────────────────────────┐
│                          Geo Data & Style Core                           │
│  - Estilos & Vector Tiles: MapTiler (OpenStreetMap Vector Tiles Schema)  │
│  - Capas del Campus: GeoJSON Modulares (Edificios, Caminos, Entradas)    │
│  - Enrutamiento: OSRM API (Rutas externas) + Dijkstra Core (Campus local)│
│  - Geoposicionamiento: expo-location (Móvil) / Geolocation API (Web)     │
└──────────────────────────────────────────────────────────────────────────┘
```

### Componentes de la Solución Recomendada:
1. **Proveedor de Tiles y Estilos:** **MapTiler Cloud**
   - Provee Vector Tiles basados en OpenStreetMap mundial con alta resolución y estilos personalizables (estilo Voyager o Streets con modo oscuro compatible con el diseño de SIGMA).
2. **Motor de Renderizado:** **MapLibre**
   - `maplibre-gl` para el cliente Web y el panel Gestory.
   - `@maplibre/maplibre-react-native` (o contenedor MapLibre Web GL embebido optimizado) para la aplicación móvil Android.
3. **Motor de Routing:** **Arquitectura Híbrida OSRM + Dijkstra Local**
   - **Rutas internas de micro-navegación del campus:** Conservar el motor Dijkstra de [`project/src/core/utils/graphUtils.js`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/src/core/utils/graphUtils.js) alimentado con los GeoJSON locales de alta precisión de SIGMA.
   - **Rutas de acceso vehicular/metropolitano hacia el campus:** OSRM (Open Source Routing Machine) público o autoalojado en backend para calcular trayectorias desde el exterior hasta la Entrada Principal.
4. **Formato Unificado de Intercambio:** **GeoJSON Estándar (RFC 7946)**
   - Mantener y extender los datasets actuales (`Edificios.json`, `Entradas.json`, `caminos.json`, `PerimetroCampus.json`).

---

## 11. Plan de Migración por Etapas

```
Etapa 0: Auditoría y Aislamiento   ──►  Etapa 1: GeoJSON & Abstracción
               │                                      │
               ▼                                      ▼
Etapa 2: Visor Web (MapLibre JS)   ──►  Etapa 3: Migración Android
               │                                      │
               ▼                                      ▼
Etapa 4: Enrutamiento OSRM         ──►  Etapa 5: Limpieza & Validación
```

### Etapa 0: Aislamiento y Preparación (Fase Actual)
- [x] Auditoría completa del repositorio (Informe `MAP_ARCHITECTURE_AUDIT.md`).
- [ ] Creación de cuenta y obtención de API Key de MapTiler (entorno gratuito).
- [ ] Definición de variables de entorno `EXPO_PUBLIC_MAPTILER_API_KEY` y `VITE_MAPTILER_API_KEY`.

### Etapa 1: Estandarización de Capas GeoJSON y Capa de Abstracción
- [ ] Crear utilidad `geoAdapters.js` para normalización bidireccional entre coordenadas `{latitude, longitude}` y GeoJSON `[longitude, latitude]`.
- [ ] Validar y tipar los 4 archivos GeoJSON de [`project/assets/geo/`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/assets/geo/).
- [ ] Crear interfaz unificada de props para el componente cartográfico `<SigmaMap />`.

### Etapa 2: Implementación de MapLibre en Web (`project/` y `gestory/`)
- [ ] Instalar `maplibre-gl` en `project/` y en `gestory/project/`.
- [ ] Reemplazar el shim estático [`project/src/core/shims/react-native-maps.web.js`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/src/core/shims/react-native-maps.web.js) por un componente interactivo real WebGL con MapLibre.
- [ ] Cargar Vector Tiles de MapTiler con las capas superpuestas GeoJSON de SIGMA (polígonos de edificios, caminos peatonales, perímetro y marcadores).
- [ ] Integrar el visor de mapa interactivo en el panel Web Gestory (`gestory/project/src/ui/pages/EdificiosPage.jsx`).

### Etapa 3: Migración de Android a MapLibre Native
- [ ] Configurar `@maplibre/maplibre-react-native` con su plugin en `project/app.json`.
- [ ] Reemplazar `<MapView>`, `<Marker>`, `<Polygon>` y `<Polyline>` de `react-native-maps` en [`project/app/(main)/index.js`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/app/%28main%29/index.js) por componentes de MapLibre (`<MapLibreGL.MapView>`, `<MapLibreGL.ShapeSource>`, `<MapLibreGL.FillLayer>`, `<MapLibreGL.LineLayer>`, `<MapLibreGL.PointAnnotation>`).
- [ ] Migrar el control de cámara de `animateToRegion` a `cameraRef.current.setCamera({ centerCoordinate, zoomLevel, animationDuration })`.
- [ ] Validar geolocalización continua y geofencing con `expo-location` sobre la nueva vista.

### Etapa 4: Integración del Motor de Routing OSRM
- [ ] Crear servicio de enrutamiento `RoutingService.js` en `project/src/core/services/`.
- [ ] Configurar cliente HTTP para la API de OSRM (`https://router.project-osrm.org/route/v1/walking/...`) para trayectos externos.
- [ ] Conectar la respuesta GeoJSON de OSRM directamente con la capa de línea activa de MapLibre.
- [ ] Mantener el enrutador local de `graphUtils.js` para micro-navegación dentro de las instalaciones del campus.

### Etapa 5: Limpieza de Dependencias y Pruebas de Integración
- [ ] Desinstalar dependencias obsoletas: `react-native-maps`, `leaflet`, `react-leaflet`.
- [ ] Eliminar `project/metro.config.js` shim resolver o actualizarlo para compatibilidad unificada.
- [ ] Ejecutar suites de integridad con `./test-integridad.ps1`.
- [ ] Validar compatibilidad en dispositivos Android físicos y en navegadores Chrome/Firefox/Safari.

---

## 12. Conclusión de la Auditoría

El proyecto **SIGMA** se encuentra en una posición **altamente favorable** para la migración cartográfica hacia tecnologías abiertas:
- **No existe ningún candado tecnológico (vendor lock-in) con las APIs de pago de Google** (Directions, Geocoding, Places).
- Todos los datos geográficos de interés (edificios, accesos, caminos, perímetros) ya residen en **formato estándar GeoJSON**.
- El motor de cálculo de rutas actual ya es **100% independiente de proveedores externos**.
- La sustitución de `react-native-maps` por **MapLibre + MapTiler** resolverá de forma definitiva la carencia actual de soporte Web, permitiendo una experiencia unificada, de alto rendimiento y libre de costos por licencias privativas tanto en Android como en Web.
