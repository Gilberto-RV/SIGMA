/**
 * Paleta base de la app. Los colores de estado cumplen WCAG 2.1 AA (≥ 4.5:1 sobre blanco)
 * para usarse como texto o como fondo de botones con texto blanco:
 *   success #2e7d32 → 5.1:1 · warning #a15c00 → 5.2:1 · error #c62828 → 5.6:1 · info #1565c0 → 5.8:1
 * Antes eran #4caf50 (2.8:1), #ff9800 (2.2:1) y #f44336 (3.7:1).
 * `primary` coincide con el tema por defecto (ThemeContext) para que las pantallas que aún
 * no leen el tema no muestren un azul distinto.
 */
export const COLORS = {
  primary: '#0a3a60',
  primarySoft: '#e8f1fa',
  secondary: '#e8e7e3',
  white: '#ffffff',
  black: '#000000',
  gray: {
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  success: '#2e7d32',
  successSoft: '#e8f5e9',
  warning: '#a15c00',
  warningSoft: '#fff4e0',
  error: '#c62828',
  errorSoft: '#fdecea',
  info: '#1565c0',
};

/** Tamaño mínimo de un objetivo táctil (Android: 48 dp; WCAG 2.5.5 recomienda 44). */
export const MIN_TOUCH_TARGET = 44;
