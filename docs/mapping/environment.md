# Configuración de Variables de Entorno Geoespaciales — SIGMA

Este documento detalla la gestión, configuración y consideraciones de seguridad para las variables de entorno relacionadas con el proveedor cartográfico **MapTiler** y el ecosistema **OpenStreetMap / MapLibre** en el proyecto **SIGMA (Innova2026)**.

---

## 1. Variables de Entorno por Aplicación

El ecosistema SIGMA cuenta con dos clientes frontend que consumen servicios cartográficos:

| Aplicación | Entorno / Bundler | Variable Requerida | Ubicación del Archivo Local | Archivo de Ejemplo |
| :--- | :--- | :--- | :--- | :--- |
| **App Móvil / Expo** | Expo SDK 54 / Metro | `EXPO_PUBLIC_MAPTILER_API_KEY` | `project/.env.local` | `project/.env.example` |
| **Panel Web Gestory** | React / Vite 5 | `VITE_MAPTILER_API_KEY` | `gestory/project/.env.local` | `gestory/project/.env.example` |

---

## 2. Diferencias Técnicas: Expo (`EXPO_PUBLIC_*`) vs. Vite (`VITE_*`)

Ambas herramientas empaquetan código para ejecutarse en el cliente (dispositivo móvil o navegador web), por lo que requieren prefijos especiales para exponer variables de forma segura sin comprometer variables privadas del backend:

### 2.1 Expo (`EXPO_PUBLIC_*`)
- **Mecanismo:** Expo y Metro automáticamente incrustan en el bundle del cliente cualquier variable de entorno cuyo nombre comience con el prefijo `EXPO_PUBLIC_`.
- **Acceso en código:** Se accede directamente mediante `process.env.EXPO_PUBLIC_MAPTILER_API_KEY`.
- **Carga de archivos:** Expo lee automáticamente `.env.local`, `.env`, `.env.development.local` según el orden de prioridad de Expo CLI.
- **Utilidad centralizada:** [`project/src/core/config/mapConfig.js`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/project/src/core/config/mapConfig.js).

### 2.2 Vite (`VITE_*`)
- **Mecanismo:** Vite expone únicamente las variables con el prefijo `VITE_` en el objeto especial `import.meta.env` para evitar la filtración accidental de secretos del sistema.
- **Acceso en código:** Se accede mediante `import.meta.env.VITE_MAPTILER_API_KEY`.
- **Carga de archivos:** Vite procesa `.env.local` con la más alta precedencia sobre `.env.development` y `.env`.
- **Utilidad centralizada:** [`gestory/project/src/core/config/mapConfig.js`](file:///c:/Users/reyda/OneDrive/Documentos/SIGMA/Innova2026/gestory/project/src/core/config/mapConfig.js).

---

## 3. Políticas de Seguridad

> [!CAUTION]
> **NUNCA subas claves reales al repositorio de control de versiones (Git).**
> Los archivos `.env`, `.env.local`, `.env.*.local` están estrictamente ignorados en todos los niveles del repositorio mediante `.gitignore`.

1. **Restricción de Claves en Producción:** En la consola de [MapTiler Cloud](https://cloud.maptiler.com/account/keys/), se recomienda aplicar restricciones de dominio (Origins HTTP) para la versión Web y restricción por Bundle ID / Package Name (`com.innovatec.sigma`) para la versión Android.
2. **Archivos `.example`:** Los archivos `.env.example` deben mantenerse siempre sin valores asignados (únicamente el nombre de la clave seguido del signo igual `=`).

---

## 4. Instrucciones para Desarrollo Local

### Paso 1: Obtener una API Key de MapTiler
1. Regístrate gratuitamente en [MapTiler Cloud](https://cloud.maptiler.com/).
2. Accede a la sección **Account -> API Keys**.
3. Copia tu clave pública (formato alfanumérico).

### Paso 2: Configurar la Aplicación Móvil (`project/`)
1. Crea el archivo local copiando la plantilla:
   ```bash
   cd project
   cp .env.example .env.local
   ```
2. Edita `project/.env.local` e introduce tu clave:
   ```env
   EXPO_PUBLIC_MAPTILER_API_KEY=tu_clave_maptiler_aqui
   ```

### Paso 3: Configurar el Panel Web Gestory (`gestory/project/`)
1. Crea el archivo local copiando la plantilla:
   ```bash
   cd gestory/project
   cp .env.example .env.local
   ```
2. Edita `gestory/project/.env.local` e introduce tu clave:
   ```env
   VITE_MAPTILER_API_KEY=tu_clave_maptiler_aqui
   ```

### Paso 4: Iniciar los Servicios
Inicia el entorno de desarrollo:
```powershell
# Desde la raíz del repositorio
npm run app:dev    # Inicia Expo / App móvil
npm run panel:dev  # Inicia Vite / Panel Gestory
```

---

## 5. Validación en Código

Para prevenir errores silenciosos durante el renderizado, el proyecto utiliza las utilidades `mapConfig`:

```javascript
// En la app móvil:
import { getMapTilerApiKey, isMapTilerConfigured } from '@/src/core/config/mapConfig';

// En el panel Gestory:
import { getMapTilerApiKey, isMapTilerConfigured } from '@/core/config/mapConfig';

// Ejemplo de uso:
if (isMapTilerConfigured()) {
  const apiKey = getMapTilerApiKey(); // Lanza excepción descriptiva si la clave no existe
}
```
