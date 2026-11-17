# Arquitectura del Sistema de Routing y Navegación de SIGMA (Etapa 4E.2)

Este documento describe la arquitectura del sistema de enrutamiento cartográfico, cálculo de progreso geométrico y navegación de **SIGMA (Innova2026)**, que integra motores de navegación (**OSRM** y **Dijkstra**), resolución de accesos (**`CampusAccessService`**), la capa de control de dominio y progreso (**`NavigationService`**), utilidades geométricas puras (**`geoAdapters`**), la pantalla principal (**`app/(main)/index.js`**) y el renderizado dinámico sobre WebGL (**`SigmaMapWeb`**).

---

## 1. Diagrama Conceptual General

```
                    ┌─────────────────────────┐
                    │  Pantalla Principal     │
                    │   (app/(main)/index.js) │
                    └────────────┬────────────┘
                                 │ (Inyección de Dependencias)
           ┌─────────────────────┴─────────────────────┐
           ▼                                           ▼
┌────────────────────┐                      ┌──────────────────────┐
│   RoutingService   │                      │  NavigationService   │
└──────────┬─────────┘                      └──────────┬───────────┘
           │                                           │ (calculateRouteProgress)
           ▼                                           ▼
┌────────────────────┐                      ┌──────────────────────┐
│    RouteResult     │─────────────────────>│   NavigationState    │
└──────────┬─────────┘                      │  (progress:          │
           │                                │   RouteProgressState)│
           ▼                                └──────────────────────┘
┌────────────────────┐
│  SigmaMapWeb (Web) │
└────────────────────┘
```

---

## 2. Geometry & Route Progress Calculation (`geoAdapters.js` & `NavigationService.js`)

El módulo [`geoAdapters.js`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/src/core/utils/geoAdapters.js) expone funciones geométricas puras e inmutables para el cálculo de avance lineal sobre polilíneas.

### Algoritmo de Proyección (`projectPointOntoSegment`)
Dado un punto GPS $P$ y un segmento $AB$:
1. Se calcula el parámetro escalar $t \in [0, 1]$ mediante proyección vectorial limitada.
2. Si el segmento es degenerado ($A = B$), $t = 0$ y se retorna la distancia directa a $A$.
3. Devuelve la coordenada proyectada $Q$, $t$ y la distancia en metros $d = \text{haversine}(P, Q)$.

### Precálculo de Geometría de Ruta
Al cargar una nueva ruta mediante `NavigationService.setRoute(routeResult)`:
- Se precálcula en $O(N)$ el arreglo de distancias por segmento (`segmentDistances`) y el arreglo de distancias acumuladas (`cumulativeDistances`).
- El resultado se almacena en caché en `this.routeGeometryCache`.

### Búsqueda Local por Ventana ($O(1)$)
Durante `updateUserPosition(userLocation)`:
- Se evalúa únicamente una ventana local de segmentos $[\text{lastSegmentIndex} - 1, \text{lastSegmentIndex} + 3]$.
- Si la desviación excede el umbral fuera de ruta (25m), se realiza un escaneo global de respaldo.
- Mantiene el índice `lastSegmentIndex` permitiendo tolerar pequeñas fluctuaciones o jitter GPS sin saltos abruptos.

---

## 3. Especificación del Modelo de Datos de Progreso

```typescript
interface RouteProgressState {
  totalDistanceMeters: number;        // Distancia total acumulada de la ruta en metros
  traversedDistanceMeters: number;    // Distancia recorrida desde el origen en metros
  remainingDistanceMeters: number;    // Distancia restante hasta el destino final en metros
  progressPercent: number;           // Porcentaje de avance de 0.00 a 100.00
  currentSegmentIndex: number;        // Índice del segmento geométrico activo [0..N-2]
  distanceToRouteMeters: number;     // Distancia perpendicular a la polilínea en metros
  isOffRoute: boolean;                // true si distanceToRouteMeters > 25m
  activeProvider: 'osrm' | 'dijkstra' | 'hybrid'; // Proveedor del segmento actual en rutas híbridas
  projectedPoint: { latitude: number; longitude: number }; // Posición proyectada ortogonalmente
}

interface NavigationState {
  status: 'idle' | 'ready' | 'navigating' | 'finished';
  isNavigating: boolean;
  isArrived: boolean;
  distanceToDestinationMeters: number | null;
  routeResult: RouteResult | null;
  progress: RouteProgressState | null;
}
```

### Separación Conceptual de Tolerancias:
- **`arrivalToleranceMeters` (12m)**: Distancia Haversine directa al punto final requerida para marcar estado `"finished"`.
- **`offRouteThresholdMeters` (25m)**: Distancia perpendicular máxima permitida desde la posición GPS hacia la polilínea antes de marcar `isOffRoute = true`.

---

## 4. Rutas Híbridas y Transición de Proveedor

En rutas de tipo `hybrid`, `NavigationService` evalúa la distancia recorrida `traversedDistanceMeters` contra los metadatos de tramos `metadata.segments`.
- Mientras `traversedDistanceMeters <= metadata.segments[0].distanceMeters`, `activeProvider` retorna `"osrm"`.
- En cuanto el usuario cruza el portón de acceso perimetral (`EP-003`, `AP-003`, `AP-004`), `activeProvider` cambia automáticamente a `"dijkstra"`.
- La polilínea se mantiene continua y sin saltos ni descalibres.
