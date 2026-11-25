import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { serviceContainer } from '../../src/infrastructure/di/ServiceContainer';
import { useTheme } from '../../src/core/context/ThemeContext';

export default function AuthIndex() {
  const router = useRouter();
  const { theme } = useTheme();
  const authUseCases = serviceContainer.get('authUseCases');

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Intenta obtener el token guardado localmente
      const token = await AsyncStorage.getItem('authToken');

      if (token) {
        // También puedes validar el token si quieres con un endpoint
        const isAuthenticated = await authUseCases.isAuthenticated(token);

        if (isAuthenticated) {
          router.replace('/(main)');
        } else {
          await AsyncStorage.removeItem('authToken'); // Limpia si no es válido
          router.replace('/auth/login');
        }
      } else {
        router.replace('/auth/login');
      }
    } catch (error) {
      console.error('Error al verificar sesión:', error);
      router.replace('/auth/login');
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.background }]}
      accessibilityRole="progressbar"
      accessibilityLabel="Verificando tu sesión"
    >
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={[styles.text, { color: theme.gray[700] }]}>Verificando tu sesión…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
  },
});
