# Plan de Desarrollo y Mejoras — SIGMA-BULL

> **Fecha:** 17 de noviembre de 2026 (semana 12 de 18 de la residencia)
> **Base:** rama `feature/maplibre-migration` (PR #1: migración a MapLibre en web y Android)
> **Alcance:** app móvil (`project/`), panel Gestory (`gestory/project/`), backend (`backend/`), servicio ML (`backend/ml-service/`), infraestructura y documentación.

Este plan sale de una auditoría del repositorio completo: lectura de código, `eslint`, `npm audit`, `expo-doctor`, builds de web, Android y Gestory, y la prueba del APK en el emulador. Cada tarea indica quién la hace:

- 🤖 **Claude**: se puede implementar y verificar de forma automática (pruebas, builds, emulador).
- 👤 **Tú**: requiere una decisión, datos de campo, cuentas o pruebas manuales.
- 🤝 **Ambos**: Claude implementa y tú validas o aportas datos.

Prioridades: **P0** (seguridad o fallas que rompen algo), **P1** (comprometido en el anteproyecto), **P2** (mejora clara de UX o calidad), **P3** (opcional). Esfuerzo: **S** (≤ 2 h), **M** (≈ ½ día), **L** (1–2 días).

---

## Avance

| Fase | Estado | Rama / PR |
| :--- | :--- | :--- |
| Migración de mapas (etapas 0–4) | ✅ Lista, en revisión | `feature/maplibre-migration` (PR #1) |
| Fase 1 — Seguridad y errores críticos | ✅ Lista salvo S8 (espera la decisión D3) | `fix/seguridad-y-bugs` |

**Hallazgos nuevos durante la Fase 1** (ya corregidos en esa rama):
- El CRUD de eventos del backend llamaba a métodos inexistentes (`new Event().createEvent`) y respondía 500 siempre: no se podían crear, editar ni borrar eventos.
- Gestory pedía `GET /api/categories`, que no existía; sin categorías el formulario de eventos no deja guardar. Se agregó la ruta y las 5 categorías del modelo se crean al arrancar si la colección está vacía.
- Gestory usaba `GET /auth/me`, `PUT /auth/profile` y `PUT /auth/change-password`, que no existían: Ajustes no funcionaba.
- La app móvil ofrecía el rol "Administrador" en el registro y un selector de rol en el perfil.
- `dotenv` se cargaba después de importar las rutas: `ML_SERVICE_URL` del `.env` se ignoraba.
- Los trabajos programados usaban la zona horaria `America/Caracas`.
- `npm run create-admin` creaba `test@gmail.com` / `admin123` y restablecía esa contraseña en cada ejecución.

**Pendiente detectado** (se suma a la Fase 4): Gestory sube imágenes a `POST /buildings/:id/media`, que no existe en el backend (tarea G8).

---

## 0. Estado actual en cifras

| Área | Hallazgo | Evidencia |
| :--- | :--- | :--- |
| Seguridad backend | Cualquiera puede registrarse o editar su perfil con rol `administrador` | `services/authServices.js` acepta `role` en `registerUser` y `updateUser`; `PUT /api/auth/me` pasa `req.body` completo |
| Seguridad backend | Secreto JWT con valor por defecto (`'clave_secreta'`, `innova_jwt_secret_2026` en compose) | `middlewares/authMiddleware.js`, `services/authServices.js`, `docker-compose.yml` |
| Seguridad backend | CORS abierto, sin rate limit en login, sin validación de entrada | `server.js` |
| Seguridad ML | `/model/reload` sin autenticación y CORS `*` | `ml-service/api.py` |
| Dependencias | 3 críticas y 36 altas (backend: `mongoose`, `proxy-addr`; app: `axios`, `expo-router`…) | `npm audit --omit=dev` |
| Gestory | 2 referencias a variables inexistentes: al borrar un evento muestra error aunque sí se borró; `getBuildingDisponibles` lanza `ReferenceError` | `EventosPage.jsx:68`, `application/usecases/BuildingUseCases.js:36` |
| Gestory | 162 errores de lint (144 `react/prop-types`, 16 variables sin usar) | `eslint .` |
| App móvil | La búsqueda traza una ruta con cada letra escrita; los filtros no tienen efecto | `SearchBar.js`, `app/(main)/index.js` `handleSearch` |
| App móvil | 0 etiquetas de accesibilidad (`accessibilityLabel`) en toda la app | `grep` sobre `app/` y `src/` |
| App móvil | Los interruptores de Configuración no se guardan ni hacen nada | `app/(main)/settings.js` |
| App móvil | Sin `timeout` HTTP: sin backend se queda en "Cargando mapa…" | `src/core/config/api.js` |
| App móvil | El modo accesibilidad no cambia la ruta (`caminos.json` no tiene rampas ni escaleras) | `toggleAccessibilityShortcut` |
| App móvil | Sin ESLint configurado; `expo-asset` desfasado | `expo lint`, `expo-doctor` |
| Mapas | `react-native-maps` y `leaflet` siguen instalados; el APK incluye clases de Google Maps | etapa 5 pendiente |
| Datos | El middleware `activityLogger` no está conectado: Big Data y ML solo usan datos generados | `backend/middlewares/activityLogger.js` |
| ML | Modelos con 98–99 % de exactitud entrenados con datos sintéticos (1,157 muestras) | `models/*_metadata.json` |
| Infra | `docker-compose.yml` apunta a 3 Dockerfiles que no existen; sin CI; sin `.env.example` en backend ni ML | repositorio |
| Producto | Tres nombres distintos: "SIGMA-BULL", "Nabi-Go Campus", "Instituto Mini-Mapa"; paquete `com.anonymous.institutominimapa` | `ThemeContext.js`, `app.json` |

---

## 1. Decisiones que necesito de ti antes de empezar

| # | Decisión | Opciones | Recomendación |
| :--- | :--- | :--- | :--- |
| D1 | ¿Fusionar el PR #1 a `main` antes de seguir? | Fusionar / apilar ramas | Fusionar: cada fase de este plan será un PR nuevo desde `main` |
| D2 | Nombre oficial de la app y paquete Android | SIGMA-BULL / Nabi-Go / otro | `SIGMA-BULL`, paquete `mx.edu.itapizaco.sigmabull` |
| D3 | ¿Los visitantes pueden ver edificios y eventos sin iniciar sesión? | Lectura pública / solo con cuenta | Lectura pública (`GET`), escritura solo admin: el anteproyecto incluye visitantes |
| D4 | ¿Guía por voz para accesibilidad? (agrega `expo-speech`) | Sí / No | Sí: las encuestas pidieron lectura por voz |
| D5 | Alturas de edificios para el 3D | Estimar con `pisos × 3.5 m` / levantarlas en campo | Estimar ahora y corregir con datos reales después |
| D6 | Servidor de rutas externas | OSRM público / OSRM propio en Docker / quitar rutas externas | OSRM público con perfil peatonal ahora; propio en P3 |

---

## 2. Fases

Calendario de la residencia: semana 12 = 16–22 nov, 13 = 23–29 nov, 14 = 30 nov–6 dic, 15 = 7–13 dic, 16 = 14–20 dic, 17 = 21–27 dic, 18 = 28–31 dic.

### Fase 1 — Seguridad y errores críticos (semana 12) · PR `fix/seguridad-y-bugs`
Cronograma: actividades 5 y 11.

| ID | Tarea | Quién | Prioridad | Esfuerzo | Terminado cuando… |
| :--- | :--- | :--- | :--- | :--- | :--- |
| S1 | Registro solo acepta `estudiante` o `profesor` (no dan permisos extra); `administrador` se rechaza. Los admins solo se crean con `npm run create-admin` | 🤖 | P0 | S | Prueba automática: registrarse con `role: administrador` responde 400 |
| S2 | `PUT /api/auth/me` acepta solo `avatar` y `password` (pide la contraseña actual para cambiarla) | 🤖 | P0 | S | Prueba: intentar cambiar `role` responde 400 |
| S3 | `JWT_SECRET` obligatorio: el servidor no arranca sin él; quitar valores por defecto del código y del compose | 🤖 | P0 | S | Arranque sin la variable falla con un mensaje claro |
| S4 | `helmet`, CORS con lista blanca por variable de entorno y rate limit en `/auth/login` y `/auth/register` | 🤖 | P0 | S | Prueba: el intento 11 de login en 15 min responde 429 |
| S5 | Validación de entrada (`zod`) en auth, eventos y edificios; errores 400 uniformes | 🤖 | P1 | M | Pruebas de payloads inválidos |
| S6 | Servicio ML: clave compartida backend↔ML (`ML_API_KEY`), CORS restringido, `/model/reload` protegido | 🤖 | P0 | S | Llamada sin clave responde 401 |
| S7 | Actualizar dependencias vulnerables (`npm audit fix`, subir `mongoose`, `axios`, `express`) sin romper builds | 🤖 | P0 | M | `npm audit --omit=dev` sin críticas; builds y pruebas en verde |
| S9 | App móvil: 5 vulnerabilidades altas que solo se corrigen subiendo `expo-router`/`expo` (SDK 55); PR propio después de fusionar PR #1 | 🤖 | P1 | M | `npm audit --omit=dev` sin altas; export web/Android y emulador en verde |
| S8 | Lectura pública de `GET /buildings` y `GET /events` (según D3) | 🤖 | P1 | S | La app muestra datos sin sesión |
| B1 | Gestory: `loadEventos` → `loadEvents` en `EventosPage.jsx`. Hoy el evento sí se borra, pero el panel muestra "No se pudo eliminar el evento" y no recarga la lista | 🤖 | P0 | S | Borrar un evento muestra éxito y actualiza la lista |
| B2 | Gestory: `getBuildingDisponibles` lanza `ReferenceError` (`buildingUseCases` no existe); si existiera, se llamaría a sí mismo sin fin. Quitar esos `console.log` | 🤖 | P0 | S | Lint sin `no-undef`; prueba del método |
| B3 | Ruta mal escrita `/tatistics/general` → `/statistics/general`, declarada antes de `/:id` | 🤖 | P2 | S | Prueba del endpoint |
| B4 | App: `timeout` de 8 s en axios; el mapa no espera a eventos ni al backend; aviso "sin conexión" | 🤖 | P0 | S | En el emulador sin backend, el mapa aparece en menos de 10 s |
| B5 | `docker-compose`: crear los 3 Dockerfiles (backend, ML, Gestory con Nginx) o quitar los servicios | 🤖 | P1 | M | `docker compose build` termina bien |
| B6 | `.env.example` para backend y ML | 🤖 | P1 | S | Archivos en el repo, sin valores reales |

### Fase 2 — Cierre de la migración de mapas y datos geoespaciales (semanas 12–13) · PR `feat/mapas-etapa-5`
Cronograma: actividades 3 y 6.

| ID | Tarea | Quién | Prioridad | Esfuerzo | Terminado cuando… |
| :--- | :--- | :--- | :--- | :--- | :--- |
| M1 | Etapa 5: desinstalar `react-native-maps`, `leaflet`, `react-leaflet`; quitar el shim y el resolver de Metro; actualizar `expo-asset` | 🤖 | P1 | S | `expo-doctor` 18/18; el APK ya no contiene `com.google.android.gms.maps` |
| M2 | OSRM con perfil peatonal (`foot`) y URL configurable; mensaje claro si el servidor público falla | 🤖 | P1 | S | Prueba con OSRM simulado |
| M3 | Backend `/api/geo/*` (edificios, caminos, entradas, perímetro) en MongoDB con número de versión; la app descarga, guarda en caché y usa los GeoJSON empaquetados como respaldo | 🤖 | P1 | L | Cambiar un dato en la BD se refleja en la app sin publicar nueva versión |
| M4 | Esquema de accesibilidad en caminos: `escaleras`, `rampa`, `pendiente`, `superficie`, `ancho` | 🤖 | P1 | S | Esquema documentado y validado |
| M5 | Levantamiento en campo de esos atributos (qué tramos tienen escaleras o rampa) | 👤 | P1 | — | Datos capturados en Gestory (G2) |
| M6 | Ruta accesible real: Dijkstra con costo que excluye escaleras y penaliza pendiente; conectar el modo accesibilidad y el filtro "Con rampa" | 🤖 | P1 | M | Pruebas: con modo accesible, la ruta evita un tramo marcado con escaleras |
| M7 | Vista 3D: `fill-extrusion` con altura por edificio (D5) y botón 2D/3D con inclinación de cámara, en web y Android | 🤖 | P2 | M | Captura en web y emulador |
| M8 | Clave de MapTiler para móvil sin restricción por Referer (o seguir con OpenFreeMap) | 👤 | P3 | S | — |

### Fase 3 — Interfaz y experiencia de la app móvil (semanas 13–14) · PR `feat/ux-app`
Cronograma: actividades 4 y 7.

| ID | Tarea | Quién | Prioridad | Esfuerzo | Terminado cuando… |
| :--- | :--- | :--- | :--- | :--- | :--- |
| U1 | Búsqueda con lista de resultados (edificios, aulas, oficinas, servicios), con la coincidencia resaltada; la ruta se traza solo al elegir un resultado; búsquedas recientes | 🤖 | P0 | M | Escribir ya no traza rutas |
| U2 | Filtros que sí filtran (accesible, con rampa, tipo); corregir estado desactualizado en `handleFilterApply` | 🤖 | P1 | S | Pruebas de `BuildingUseCases.searchBuildings` |
| U3 | Tarjeta de ruta: distancia, tiempo a pie (≈ 1.3 m/s), origen; durante la navegación, barra de progreso, metros restantes y aviso "fuera de ruta" con recálculo automático (los datos ya los calcula `NavigationService`) | 🤖 | P1 | M | Captura en emulador con ubicación simulada en movimiento |
| U4 | Indicaciones paso a paso calculadas de la geometría ("gira a la izquierda en 20 m") y lectura por voz opcional (D4) | 🤖 | P1 | L | Pruebas unitarias de giros; voz en emulador |
| U5 | Accesibilidad: `accessibilityLabel`, `accessibilityRole` y `accessibilityHint` en todos los controles; objetivos táctiles ≥ 44 dp; respetar el tamaño de letra del sistema; anuncios de estado de navegación para TalkBack | 🤖 | P0 | M | Auditoría: 0 controles sin etiqueta |
| U6 | Tema de alto contraste (pedido en las encuestas) y modo oscuro | 🤖 | P1 | M | Contraste ≥ 4.5:1 (WCAG AA) medido |
| U7 | Configuración que funciona: preferencias guardadas en AsyncStorage; el modo accesibilidad global afecta ruta, contraste y tamaño de letra; quitar o conectar "Notificaciones" | 🤖 | P1 | S | Los ajustes sobreviven a reiniciar la app |
| U8 | Componentes con el tema activo (`SearchBar`, `FilterModal`, `BuildingInfoPanel` usan `COLORS` fijos) | 🤖 | P2 | S | Cambiar de tema cambia toda la UI |
| U9 | Aviso de geocerca no bloqueante (banner en lugar de `Alert`) y sin texto de "INNOVATEC" | 🤖 | P2 | S | — |
| U10 | Estados de carga, vacío y error con reintento; banner de sin conexión | 🤖 | P1 | S | Probado sin backend en emulador |
| U11 | Panel de edificio: quitar la fila vacía; mostrar fotos, horarios, baños por piso y datos de accesibilidad de la entrada | 🤖 | P2 | M | — |
| U12 | Eventos: fechas reales, "Hoy / Próximos", quitar o marcar como demo los eventos de 2024 de respaldo | 🤖 | P2 | S | — |
| U13 | Pantalla de bienvenida la primera vez, que explica permisos y modo accesible | 🤖 | P3 | S | — |
| U14 | Unificar nombre, ícono y paquete según D2 | 🤝 | P1 | S | `app.json` y temas consistentes |
| U15 | ESLint + Prettier en la app; quitar `console.log` y usar un logger | 🤖 | P2 | S | `expo lint` sin errores |

### Fase 4 — Panel Gestory (semanas 13–14) · PR `feat/gestory-mapa`
Cronograma: actividad 8.

| ID | Tarea | Quién | Prioridad | Esfuerzo | Terminado cuando… |
| :--- | :--- | :--- | :--- | :--- | :--- |
| G1 | Visor de mapa MapLibre en Edificios: ver el campus, seleccionar un edificio y abrir su ficha | 🤖 | P1 | M | Captura del panel |
| G2 | Editor geoespacial: mover entradas, editar polígonos y caminos, capturar atributos de accesibilidad (M4) y guardarlos en `/api/geo` (M3) | 🤖 | P1 | L | Prueba de extremo a extremo: editar → la app lo refleja |
| G3 | Ubicación de eventos elegida en el mapa | 🤖 | P2 | S | — |
| G4 | Mapa de calor de actividad o saturación sobre el campus (Big Data + ML) | 🤖 | P2 | M | — |
| G5 | Lint en verde: PropTypes o JSDoc, variables sin usar, dependencias de hooks | 🤖 | P2 | M | `eslint .` con 0 errores |
| G6 | Partir `MLDashboardPage.jsx` (1,185 líneas) en componentes | 🤖 | P2 | M | Ningún archivo de página pasa de 400 líneas |
| G7 | ~~Ajustes de Gestory conectados al backend~~ (hecho en la Fase 1) | 🤖 | P2 | S | ✅ |
| G8 | Subida de imágenes de edificios: endpoint `POST /api/buildings/:id/media` (multer, límite de tamaño y tipo) o quitar el campo del formulario | 🤖 | P1 | M | Subir una imagen desde Gestory se ve en la app |

### Fase 5 — Backend, Big Data y Machine Learning (semana 14) · PR `feat/datos-y-ml`
Cronograma: actividades 5 y 9.

| ID | Tarea | Quién | Prioridad | Esfuerzo | Terminado cuando… |
| :--- | :--- | :--- | :--- | :--- | :--- |
| BD1 | Conectar `activityLogger`: la app envía eventos anónimos (búsquedas, rutas, edificios vistos) a `/api/bigdata` | 🤖 | P1 | M | Registros reales visibles en el dashboard |
| BD2 | Pruebas de API (`node:test` + `supertest`) para auth, edificios, eventos y Big Data con MongoDB en memoria | 🤖 | P1 | M | Suite en verde en CI |
| BD3 | OpenAPI/Swagger del backend en `/api/docs` | 🤖 | P2 | M | — |
| ML1 | Evaluación honesta: separación temporal, comparación contra un modelo base, métricas reales en el dashboard; documentar que el entrenamiento actual usa datos sintéticos | 🤖 | P1 | M | Informe de métricas en `docs/` |
| ML2 | Pipeline de reentrenamiento con datos reales de BD1; versión de modelo y fecha en `/model/info` | 🤖 | P2 | M | — |
| ML3 | Mostrar saturación prevista en la app (color del edificio u horas pico en el panel) | 🤖 | P2 | M | Captura en emulador |
| ML4 | Pruebas `pytest` del servicio ML | 🤖 | P2 | S | — |

### Fase 6 — Calidad, CI e infraestructura (semanas 14–15) · PR `chore/ci-calidad`
Cronograma: actividades 10 y 11.

| ID | Tarea | Quién | Prioridad | Esfuerzo | Terminado cuando… |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q1 | Unificar las pruebas de la app en `npm test` (`node --test`) | 🤖 | P1 | S | — |
| Q2 | GitHub Actions: lint, pruebas, `expo export` web y Android, build de Gestory y pruebas del backend en cada PR | 🤖 | P1 | M | Checks en verde en un PR |
| Q3 | Build Android en CI (Gradle) o EAS como opcional | 🤖 | P3 | M | — |
| Q4 | Limpieza: `.bolt/`, documentos duplicados del ML (4 README), `mapConfig.js` sin usar hasta G1, scripts PowerShell obsoletos | 🤖 | P3 | S | — |
| Q5 | Mover el proyecto fuera de OneDrive, o excluir `node_modules` y las carpetas de build | 👤 | P2 | S | — |

### Fase 7 — Documentación y entrega (semanas 15–18)
Cronograma: actividades 12 y 13.

| ID | Tarea | Quién | Prioridad | Esfuerzo | Terminado cuando… |
| :--- | :--- | :--- | :--- | :--- | :--- |
| D1 | README actualizado (nombre, arquitectura, instalación en Windows, variables de entorno) | 🤖 | P1 | S | — |
| D2 | Manual técnico: arquitectura, API, datos geoespaciales, routing, ML, despliegue | 🤖 | P1 | M | — |
| D3 | Manual de usuario de la app y del panel con capturas del emulador | 🤖 | P1 | M | — |
| D4 | Evidencias por actividad del cronograma (PRs, commits, capturas) para el reporte de residencia | 🤝 | P1 | S | — |

---

## 3. Lo que requiere tu participación (no lo puedo hacer yo)

- **Pruebas en teléfono real:** líneas discontinuas, precisión del GPS en exteriores, batería durante la navegación, TalkBack.
- **Levantamiento en campo:** rampas, escaleras y pendientes de los caminos (M5); alturas o pisos reales de los edificios (D5).
- **Pruebas de usabilidad** con estudiantes y visitantes, incluidas personas con discapacidad (lo comprometido en las encuestas).
- **Cuentas y claves:** MapTiler para móvil (M8), hosting si se despliega, secretos de producción.
- **Decisiones de la sección 1** y aprobación de cada PR.
- **Mover el proyecto fuera de OneDrive** (Q5).

---

## 4. Orden de ejecución propuesto

1. D1 → fusionar PR #1.
2. **Fase 1** completa (seguridad primero; es lo más urgente y lo más rápido).
3. **Fase 2** (M1–M3, M6–M7) en paralelo con **Fase 3** (U1, U2, U5 primero).
4. **Fase 4** después de M3, porque el editor guarda en `/api/geo`.
5. **Fase 5** y **Fase 6**.
6. **Fase 7** desde la semana 15, alimentada por lo anterior.

Cada fase es un PR independiente con sus pruebas, su build y, cuando aplica, capturas del emulador.

## 5. Riesgos

| Riesgo | Mitigación |
| :--- | :--- |
| Los datos de accesibilidad de campo no llegan a tiempo | M6 funciona con datos parciales; los tramos sin dato se tratan como "desconocido" y se avisa en la ruta |
| Subir dependencias rompe algo | S7 en un PR propio, con builds de web, Android y Gestory como verificación |
| El servidor OSRM público limita o se cae | Respaldo con Dijkstra hasta la entrada más cercana y aviso al usuario; OSRM propio en P3 |
| Poco tiempo antes de la entrega | Ejecutar en orden de prioridad: P0 → P1; los P3 son opcionales |
