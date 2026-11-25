# Revisión de diseño e interfaz — app móvil y Gestory

> **Fecha:** 25 de noviembre de 2026 (semana 13 de la residencia)
> **Rama:** `claude/ux-app-diseno-5ceacf` (sale de `feat/mapas-etapa-5`)
> **Alcance:** app móvil (`project/`) y panel Gestory (`gestory/project/`). Fases 3 y 4 de `docs/PLAN_DE_DESARROLLO.md`.
> **Capturas:** `Documentos/Residencias/Capturas/antes/` y `.../despues/` (Android 15 en emulador Pixel 6, 1080 × 2400; Gestory en Edge a 1440 × 900).

Se evaluó jerarquía visual, consistencia de color y tipografía, contraste (WCAG 2.1 AA), tamaño de los objetivos táctiles, estados vacíos y de carga, y coherencia entre la app y el panel. Los cambios son solo visuales y de experiencia: no cambian la lógica de rutas, la autenticación ni el modelo de datos.

Prioridad: **P0** rompe algo o impide usar la función · **P1** afecta a muchos usuarios o a la accesibilidad · **P2** pulido.

## App móvil

| # | Prioridad | Hallazgo | Evidencia (antes) | Estado |
| :- | :- | :- | :- | :- |
| A1 | P0 | Al terminar el registro la app **se cierra** en Android: el `Picker` nativo de rol (`RNCAndroidDialogPicker`) aborta con SIGABRT al desmontarse la pantalla (nueva arquitectura). La cuenta sí se crea. | `app-02-registro`, logcat | ✅ Selector segmentado accesible "Estudiante / Profesor". Verificado: 0 fallos nativos al registrarse. |
| A2 | P1 | Colores de estado sin contraste suficiente: verde `#4caf50` 2.8:1 ("Completamente accesible", botón "Iniciar navegación"), naranja `#ff9800` 2.2:1, rojo `#f44336` 3.7:1 ("Cerrar sesión"), gris `#9e9e9e` 2.7:1 en íconos. | `app-06`, `app-09` | ✅ `#2e7d32` 5.1:1, `#a15c00` 5.2:1, `#c62828` 5.6:1; íconos en gris 700. En `colors.js` y en los tres temas. |
| A3 | P1 | Ningún control tenía `accessibilityLabel` (U5); botones de solo ícono (menú, filtros, centrar, cerrar) mudos para TalkBack. Objetivos táctiles de 26–30 dp (cerrar panel, limpiar búsqueda, atajos). Textos de 9–11 px. | código, `app-03` | ✅ Etiquetas, roles y estados en mapa, búsqueda, paneles, menú, perfil y configuración; objetivos ≥ 44 dp; textos ≥ 12 px. Falta auditoría completa con TalkBack y respetar el tamaño de letra del sistema. |
| A4 | P1 | La búsqueda traza una ruta con **cada letra** hacia la primera coincidencia y no muestra resultados (U1). | `app-05-busqueda` | ✅ Lista de resultados con la coincidencia resaltada y estado "sin resultados"; la ruta se calcula al elegir. Pendiente: búsquedas recientes. |
| A5 | P1 | Botones bajo la barra de navegación de Android (Filtros "Limpiar/Aplicar", "Iniciar navegación"): la app dibuja de borde a borde y los paneles no sumaban el área segura. | `app-05b`, `app-06` | ✅ Paneles y modal suman `insets.bottom`. |
| A6 | P1 | Con el teclado abierto, el título del registro queda bajo la barra de estado. | `app-02b` | ✅ Formularios dentro de `ScrollView`. |
| A7 | P1 | Panel de edificio: fila vacía (la BD guarda "Media" y el código esperaba "medium"), título y descripción del mismo tamaño, sin distancia ni tiempo, y el destino queda **detrás** del panel. | `app-06`, `app-07` | ✅ Chips (plantas, accesible, disponible, afluencia), tarjeta "390 m · 5 min a pie" (ya lo calculaba `RoutingService`) y cámara desplazada para que el destino quede visible. |
| A8 | P1 | "Ruta Inclusiva" no muestra si está activa (solo un `Alert`). | `app-08b` | ✅ El atajo cambia de estado (✓) y la tarjeta de ruta dice "Ruta inclusiva". |
| A9 | P1 | **Ruta inclusiva = ruta normal.** `caminos.json` no tiene atributos de accesibilidad por tramo (escaleras, rampa, pendiente), así que no hay tramos que evitar. | `app-07` vs `app-08` | ⏳ Requiere el levantamiento en campo (M5). No se inventaron datos. |
| A10 | P1 | Tres nombres: "Instituto Mini-Mapa" (login), "Nabi-Go Campus" (mapa), "EventAdmin" (panel); paquete `com.anonymous.institutominimapa`. | `app-01`, `gestory-02` | 🟡 Login y registro usan el nombre del tema activo; el panel se llama "Gestory · SIGMA-BULL". El nombre oficial y el paquete esperan la decisión D2. |
| A11 | P1 | Inicio de sesión y registro sin etiquetas visibles (solo placeholder), sin marca. | `app-01`, `app-02` | ✅ Etiquetas, marca del tema, mostrar/ocultar contraseña, autocompletado. |
| A12 | P1 | Perfil y Configuración sin barra superior: no hay forma visible de volver al mapa; "Eliminar cuenta" con el mismo peso que "Guardar"; placeholder "••••••••" parece una contraseña escrita. | `app-10`, `app-11` | ✅ Barra con menú, avatar con inicial, acciones destructivas en segundo plano, textos de ayuda. |
| A13 | P2 | El panel de atajos y eventos tapa más de la mitad del mapa; 16 puntos de paginación. | `app-03` | ✅ Tarjetas horizontales compactas y contador "1 de 16". |
| A14 | P2 | Menú lateral sin sección activa; avatar vacío. | `app-09` | ✅ Sección activa resaltada e inicial del correo. |
| A15 | P2 | Aviso de geocerca con texto de "INNOVATEC" y tono de evaluación (U9). | código | ✅ Texto nuevo. Sigue siendo un `Alert` (banner pendiente). |
| A16 | P2 | Interruptores de Configuración no se guardan ni hacen nada (U7). | `app-11` | ⏳ Cambio funcional, fuera de esta rama. |
| A17 | P2 | Los filtros "Con rampa" y "Accesible" no filtran (U2). | `app-05b` | ⏳ Cambio funcional, fuera de esta rama. |
| A18 | P2 | El carrusel muestra eventos ya pasados ("29 sep 2026") con imágenes de banco que no corresponden (U12). | `app-03` | ⏳ |
| A19 | P2 | No existe pantalla de bienvenida: la ruta raíz abre el mapa y el inicio de sesión solo aparece al cerrar sesión (U13, decisión D3). | navegación | ⏳ |
| A20 | P2 | Sin tema de alto contraste ni modo oscuro (U6). | — | ⏳ |

## Gestory

| # | Prioridad | Hallazgo | Evidencia (antes) | Estado |
| :- | :- | :- | :- | :- |
| G-a | P1 | **Datos ficticios en el tablero:** "+12 % / +8 % / +5 % vs mes anterior" fijos en el código, paneles "Conectando con la API…" que nunca cargan y campana con "3" notificaciones fijas. | `gestory-02` | ✅ Textos que explican cada cifra, próximos eventos y estado de edificios con los datos ya cargados; sin campana. |
| G-b | P1 | Contraste: tarjetas de Big Data con texto blanco sobre degradados cian/amarillo (1.3–2.7:1); botón "Ejecutar Procesamiento" blanco sobre gris claro (casi invisible); día actual ámbar con texto blanco (2.2:1); verdes `#10b981` (2.5:1). | `gestory-05`, `gestory-06` | ✅ Tarjetas blancas con acento, botón con borde, día actual con contorno, estados ≥ 4.5:1. |
| G-c | P1 | Identidad distinta a la app: marca "EventAdmin" (plantilla), azul genérico `#2563eb`, `lang="en"`. | `gestory-01`, `gestory-02` | ✅ "Gestory · SIGMA-BULL", azul marino `#0a3a60` de la app, `lang="es"`. |
| G-d | P1 | Botones, campos y listas en Arial (no heredan la fuente); sin foco visible con teclado. | `gestory-04`, `gestory-08` | ✅ `font: inherit` y `:focus-visible`. |
| G-e | P2 | Insignia "Frecuencia estudiantil" vacía (la BD guarda "Media"). | `gestory-03` | ✅ |
| G-f | P2 | Big Data y ML con márgenes y títulos distintos al resto; subtítulo flotando a la derecha en Tablero y Ajustes. | `gestory-02`, `-06`, `-07`, `-08` | ✅ |
| G-g | P2 | Avatar pedido a `via.placeholder.com`. | `gestory-08` | ✅ Inicial del correo. |
| G-h | P2 | Edificios sin foto: un recuadro gris grande por tarjeta. | `gestory-03` | ⏳ Falta el endpoint de imágenes (G8). |
| G-i | P2 | Mezcla de inglés: "Dashboard de Big Data", "Machine Learning Dashboard". | `gestory-06`, `-07` | ⏳ |
| G-j | P2 | Lint: `type` sin usar y advertencia de `key` en `EdificiosPage` (ya existían). | consola | ⏳ (G5) |

## Coherencia app ↔ Gestory

Antes la app usaba azul marino y el panel azul Tailwind, con verdes y rojos distintos en cada uno. Ahora ambos comparten el primario `#0a3a60`, su versión clara `#e8f1fa` y los mismos colores de estado con contraste AA.

## Problemas para correr el proyecto (25-nov-2026)

- **MongoDB Atlas ya no existe:** los hosts de `MONGO_URI` (`*.nctkhhn.mongodb.net`) no resuelven, ni con el DNS de Google. El backend no arranca con `backend/.env`. Para las capturas se usó un `mongod` 8.2.6 local sembrado con los scripts del repo (`clean-and-setup`, `load-buildings-modular`, `seed-geo`, `generate-events`, `generate-fake-data --days=30`, `seed_e12`, `create-admin`). Los datos de las capturas son de esos scripts: 13 edificios, 19 eventos y 30 días de Big Data sintético.
- **El APK no compila desde el worktree:** ninja falla con "build.ninja still dirty after 100 tries" y CMake advierte rutas de más de 250 caracteres (worktree bajo `.claude/worktrees/` dentro de OneDrive). Se usó el APK de depuración del 17-nov del checkout principal; el JS lo sirve Metro desde esta rama. Para compilar, conviene una ruta corta fuera de OneDrive.
- Metro no detecta cambios bajo OneDrive: hay que reiniciarlo con `expo start --clear`.
- El servicio ML en Windows necesita `PYTHONUTF8=1`: imprime emojis y falla con `UnicodeEncodeError` en la consola cp1252.
- `JWT_SECRET` en `backend/.env` tiene menos de 32 caracteres (el backend lo advierte al arrancar).
