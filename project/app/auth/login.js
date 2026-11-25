import { useRef, useState } from 'react';
import { Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { serviceContainer } from '../../src/infrastructure/di/ServiceContainer';
import { DIMENSIONS } from '../../src/core/constants/dimensions';
import { MIN_TOUCH_TARGET } from '../../src/core/constants/colors';
import { useTheme } from '../../src/core/context/ThemeContext';
import AuthLayout from '../../src/presentation/components/AuthLayout';
import FormField from '../../src/presentation/components/FormField';
import PrimaryButton from '../../src/presentation/components/PrimaryButton';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const passwordRef = useRef(null);
  const router = useRouter();
  const { theme } = useTheme();
  const authUseCases = serviceContainer.get('authUseCases');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Faltan datos', 'Escribe tu correo y tu contraseña.');
      return;
    }

    setIsLoading(true);
    try {
      await authUseCases.login(email.trim(), password);
      router.replace('/(main)');
    } catch (error) {
      Alert.alert('No se pudo iniciar sesión', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const goToRegister = () => {
    router.push('/auth/register');
  };

  return (
    <AuthLayout title="Inicia sesión" subtitle="Usa el correo con el que te registraste.">
      <FormField
        label="Correo electrónico"
        placeholder="nombre@correo.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        editable={!isLoading}
      />

      <FormField
        ref={passwordRef}
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleLogin}
        editable={!isLoading}
      />

      <PrimaryButton
        label="Iniciar sesión"
        onPress={handleLogin}
        loading={isLoading}
        style={styles.submit}
      />

      <TouchableOpacity
        style={styles.linkButton}
        onPress={goToRegister}
        disabled={isLoading}
        accessibilityRole="link"
        accessibilityLabel="¿No tienes cuenta? Regístrate"
      >
        <Text style={[styles.linkText, { color: theme.gray[700] }]}>
          ¿No tienes cuenta? <Text style={[styles.linkStrong, { color: theme.primary }]}>Regístrate</Text>
        </Text>
      </TouchableOpacity>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  submit: {
    marginTop: DIMENSIONS.spacing.sm,
  },
  linkButton: {
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: DIMENSIONS.spacing.md,
  },
  linkText: {
    fontSize: DIMENSIONS.fontSize.sm,
    fontFamily: 'Roboto-Regular',
  },
  linkStrong: {
    fontFamily: 'Roboto-Bold',
  },
});
