import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const THEMES = {
  nabigo: {
    id: 'nabigo',
    name: 'Nabi-Go Premium',
    appName: 'Nabi-Go Campus',
    primary: '#0a3a60',
    secondary: '#318ce7',
    background: '#ffffff',
    text: '#212121',
    cardBg: 'rgba(255, 255, 255, 0.88)',
    cardBorder: 'rgba(10, 58, 96, 0.15)',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    info: '#2196f3',
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
    }
  },
  university: {
    id: 'university',
    name: 'Universidad Tecnológica',
    appName: 'UT Campus Guía',
    primary: '#800020', // Guinda
    secondary: '#d4af37', // Oro / Gold
    background: '#ffffff',
    text: '#212121',
    cardBg: 'rgba(255, 255, 255, 0.88)',
    cardBorder: 'rgba(128, 0, 32, 0.15)',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    info: '#d4af37',
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
    }
  },
  ecocampus: {
    id: 'ecocampus',
    name: 'Eco-Campus Corporativo',
    appName: 'Eco-Campus Guide',
    primary: '#1e8449', // Verde esmeralda
    secondary: '#f39c12', // Naranja cálido
    background: '#ffffff',
    text: '#212121',
    cardBg: 'rgba(255, 255, 255, 0.88)',
    cardBorder: 'rgba(30, 132, 73, 0.15)',
    success: '#1e8449',
    warning: '#f39c12',
    error: '#e74c3c',
    info: '#3498db',
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
    }
  }
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState(THEMES.nabigo);

  useEffect(() => {
    // Cargar el tema guardado en persistencia
    async function loadTheme() {
      try {
        const savedThemeId = await AsyncStorage.getItem('app_theme_id');
        if (savedThemeId && THEMES[savedThemeId]) {
          setCurrentTheme(THEMES[savedThemeId]);
        }
      } catch (e) {
        console.warn('Error cargando tema guardado:', e);
      }
    }
    loadTheme();
  }, []);

  const setThemeById = async (themeId) => {
    if (THEMES[themeId]) {
      setCurrentTheme(THEMES[themeId]);
      try {
        await AsyncStorage.setItem('app_theme_id', themeId);
      } catch (e) {
        console.warn('Error guardando tema:', e);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, setThemeById, THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider');
  }
  return context;
}
