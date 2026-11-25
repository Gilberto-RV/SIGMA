// src/core/config/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Constants from 'expo-constants';

/**
 * URL del backend:
 * 1. EXPO_PUBLIC_API_URL (obligatoria en builds nativos y producción; ver project/.env.example).
 * 2. En desarrollo con Expo Go / Metro: la misma IP que sirve el bundle, puerto 5000.
 * 3. Respaldo: localhost (sirve en web y en el emulador con `adb reverse tcp:5000 tcp:5000`).
 * Antes el respaldo era una IP fija de una red local (192.168.1.89), que solo funcionaba en un equipo.
 */
const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoClient?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:5000/api`;
  }
  console.warn('[api] EXPO_PUBLIC_API_URL no está definida; usando http://localhost:5000/api');
  return 'http://localhost:5000/api';
};

const API_URL = getBaseUrl();

const api = axios.create({
  baseURL: API_URL,
  // Sin timeout, una petición a un backend apagado podía colgar la app varios minutos.
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
