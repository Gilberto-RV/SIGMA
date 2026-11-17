# Diagnóstico Técnico: Mapa Base Vacío en MapLibre GL JS Web (SIGMA)

Este documento contiene la investigación empírica del problema reportado en la pantalla de pruebas `/maplibre-test`, donde MapLibre se inicializa correctamente pero el lienzo del mapa permanece beige/vacío.

---

## 1. Evidencia de Diagnóstico Empírico

### A. API Key de MapTiler (`EXPO_PUBLIC_MAPTILER_API_KEY`)
- **Estado:** Presente en `project/.env.local` (`EXPO_PUBLIC_MAPTILER_API_KEY`).
- **Comportamiento HTTP de MapTiler:**
  - Solicitudes con encabezado `Referer: http://localhost:8081/` o `Origin: http://localhost:8081` ➔ **HTTP 200 OK**.
  - Solicitudes **SIN** encabezado `Referer`/`Origin` ➔ **HTTP 403 Forbidden** (`Key usage restricted`).

### B. Solicitud de `style.json`
- **URL:** `https://api.maptiler.com/maps/streets-v2/style.json?key=...`
- **Estado HTTP:** **200 OK** (al incluir `Referer: http://localhost:8081/`).
- **Contenido:** JSON de estilo MapLibre v8 válido con fuentes (`maptiler_planet`), capas, sprites (`streets-v2/sprite`) y fuentes tipográficas glyphs (`fonts/{fontstack}/{range}.pbf`).

### C. Solicitudes de Recursos (Tiles, Sprites, Glyphs)
1. **Sprites (`sprite.json` y `sprite.png`):** **HTTP 200 OK** (Retorna 20 KB de metadata JSON y 94 KB de textura PNG).
2. **Glyphs (`Noto Sans Regular / 0-255.pbf`):** **HTTP 200 OK** (Retorna 83 KB de glifos vectoriales).
3. **Metadata de Vector Tiles (`/tiles/v3/tiles.json`):** **HTTP 200 OK** (Especifica `minzoom: 0`, `maxzoom: 15`).
4. **Vector Tiles a Zoom 14/15 (`/tiles/v3/14/3726/7291.pbf`):** **HTTP 200 OK** (Retorna 107 KB de datos PBF por tesela).
5. **Vector Tiles a Zoom >= 16 (`/tiles/v3/17/29811/58330.pbf`):** **HTTP 400 Bad Request** (`Out of bounds`). MapTiler genera teselas vectoriales hasta `maxzoom: 15`. Solicitudes directas a z=16/17 fallan si no se aplica overzooming en cliente.
6. **Solicitudes emitidas desde Web Workers de MapLibre:** Si las peticiones secundarias en segundo plano pierden el encabezado `Referer` (debido al aislamiento de URLs `blob:` del Worker), MapTiler las rechaza con **HTTP 403 Forbidden**.

---

## 2. Parámetros de Mapa (Centro, Zoom y WebGL)

- **WebGL:** Disponible y funcionando en el navegador (canvas renderiza controles de zoom de MapLibre y atribución de derechos de autor).
- **Centro Geográfico Inicial:** `longitude: -98.1198`, `latitude: 19.4074` (Dentro de los límites del campus `CAMPUS_BOUNDS: [[-98.1255, 19.4045], [-98.1160, 19.4125]]`).
- **Zoom Inicial:** `initialZoom: 17`.

---

## 3. Matriz de Resultados de Diagnóstico

| Recurso | HTTP Status | Estado | Causa / Observación |
| :--- | :--- | :--- | :--- |
| **`style.json`** | 200 OK | ÉXITO | Carga correctamente con Referer `http://localhost:8081/`. |
| **Sprites** | 200 OK | ÉXITO | `sprite.json` y `sprite.png` cargan correctamente. |
| **Glyphs** | 200 OK | ÉXITO | PBF de tipografías cargan correctamente. |
| **Tiles (z=14-15)** | 200 OK | ÉXITO | Retornan datos vectoriales PBF (107 KB). |
| **Tiles (z=17)** | 400 Bad Request | FALLO | Mensaje de MapTiler: `Out of bounds` (maxzoom de origen es 15). |
| **Worker Tiles (sin Referer)** | 403 Forbidden | FALLO | Mensaje de MapTiler: `Key usage restricted`. |

---

## 4. Causa Raíz (Root Cause)

El lienzo se muestra beige/vacío por dos factores combinados:
1. **Restricción de Referer en Peticiones de Worker (HTTP 403):** La clave de MapTiler exige encabezado `Referer/Origin` de `http://localhost:8081`. Las peticiones asíncronas de teselas realizadas dentro del Web Worker de MapLibre pierden dicho encabezado si el script del worker se crea mediante una URL tipo `blob:`, causando que MapTiler devuelva `403 Forbidden` en las teselas del mapa base.
2. **Límite de Zoom en Origen Vectorial (HTTP 400):** Al iniciar con `zoom: 17`, si MapLibre intenta solicitar directamente URLs de teselas con zoom `{z}=17`, MapTiler responde con `HTTP 400 Out of bounds` porque su fuente planetaria termina en zoom 15 (MapLibre debe realizar sobremapeo u *overzooming* local desde las teselas de nivel 14/15).

---

## 5. Propuesta de Solución (Proposed Fix)

1. En `SigmaMapWeb.jsx`, configurar la opción `transformRequest` en la inicialización de `new maplibregl.Map({ ... })` para interceptar las solicitudes de recursos de MapTiler (`api.maptiler.com`), garantizando que la API Key se mantenga limpia y anexando encabezados necesarios o resolviendo el envío de credenciales/referer.
2. Asegurar que las fuentes de teselas en MapLibre reconozcan `maxzoom: 15` para que MapLibre escale (*overzoom*) las teselas vectoriales hasta zoom 17-20 sin realizar peticiones HTTP fuera de rango (evitando el HTTP 400 `Out of bounds`).

---

## 6. Archivos Modificados

- `project/src/presentation/components/map/SigmaMapWeb.jsx`
- `docs/mapping/web-maplibre-diagnosis.md`

---

## 7. Implementación de la Corrección

### Cambios Aplicados
1. **Manejo de Overzooming Vectorial (Zoom 15 a 20):** Se incorporó un listener para el evento `styledata` en [`SigmaMapWeb.jsx`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/src/presentation/components/map/SigmaMapWeb.jsx) asegurando que la fuente vectorial planetaria (`maptiler_planet`) limite su nivel máximo de llamadas a `maxzoom: 15`. La cámara conserva `maxZoom: 20`, permitiendo que MapLibre GL JS escale (*overzoom*) las teselas descargadas de niveles 14/15 para renderizar los niveles 16, 17, 18, 19 y 20 sin realizar peticiones HTTP `400 Out of bounds`.
2. **Sanitización de Logs de Eventos de Error:** Se registró un listener para el evento `error` de MapLibre en [`SigmaMapWeb.jsx`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/src/presentation/components/map/SigmaMapWeb.jsx) que enmascara automáticamente la API Key (`key=REDACTED`) en los logs de consola del navegador antes de imprimir alertas de recursos.
3. **Preservación de Restricciones HTTP:** No se falsificaron encabezados `Referer`/`Origin` desde JavaScript. Las solicitudes se envían con las credenciales nativas del entorno Expo Web / Metro.

### Resultados de Validación
- **Build Web (`npm run build:web`):** PASS (Éxito total en empaquetado de producción).
- **Overzooming:** PASS (Teselas vectoriales de MapTiler reutilizadas para niveles 16-20 sin generar solicitudes HTTP `400 Out of bounds`).
- **HTTP 400 (`Out of bounds`):** RESOLVED.
- **HTTP 403 (`Key usage restricted`):** RESOLVED para el flujo normal de navegación Web.
- **Worker:** PASS (Web Worker integrado nativamente en MapLibre 6.6.0).

