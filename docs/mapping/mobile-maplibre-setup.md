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
