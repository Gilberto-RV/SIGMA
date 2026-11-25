import { useRef, useState } from 'react';
import { Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { GraduationCap, BookOpen } from 'lucide-react-native';
import { serviceContainer } from '../../src/infrastructure/di/ServiceContainer';
import { DIMENSIONS } from '../../src/core/constants/dimensions';
import { MIN_TOUCH_TARGET } from '../../src/core/constants/colors';
import { useTheme } from '../../src/core/context/ThemeContext';
import AuthLayout from '../../src/presentation/components/AuthLayout';
import FormField from '../../src/presentation/components/FormField';
import PrimaryButton from '../../src/presentation/components/PrimaryButton';
import SegmentedControl from '../../src/presentation/components/SegmentedControl';

const ROLE_OPTIONS = [
  { value: 'estudiante', label: 'Estudiante', icon: GraduationCap },
  { value: 'profesor', label: 'Profesor', icon: BookOpen },
];

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatar, setAvatar] = useState('');
  const [role, setRole] = useState('estudiante');
  const [isLoading, setIsLoading] = useState(false);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);
  const avatarRef = useRef(null);
  const router = useRouter();
  const { theme } = useTheme();
  const authUseCases = serviceContainer.get('authUseCases');

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Faltan datos', 'Completa correo, contraseña y confirmación.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Revisa la contraseña', 'Las contraseñas no coinciden.');
      return;
    }

    if (avatar && !isValidImageUrl(avatar)) {
      Alert.alert('Foto de perfil', 'La URL debe empezar con http(s) y terminar en .jpg, .jpeg o .png.');
      return;
    }

    setIsLoading(true);
    try {
      await authUseCases.register(email.trim(), password, avatar.trim(), role);
      router.replace('/(main)');
    } catch (error) {
      Alert.alert('No se pudo crear la cuenta', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const isValidImageUrl = (url) => {
    return /^https?:\/\/.*\.(jpg|jpeg|png)$/i.test(url);
  };

  const goToLogin = () => {
    router.back();
  };

  return (
    <AuthLayout compact title="Crea tu cuenta" subtitle="Guarda tu perfil y consulta los eventos.">
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
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        editable={!isLoading}
      />

      <FormField
        ref={confirmRef}
        label="Confirmar contraseña"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => avatarRef.current?.focus()}
        editable={!isLoading}
      />

      <FormField
        ref={avatarRef}
        label="Foto de perfil (opcional)"
        hint="Enlace a una imagen .jpg o .png"
        placeholder="https://…/foto.jpg"
        value={avatar}
        onChangeText={setAvatar}
        autoCapitalize="none"
        keyboardType="url"
        editable={!isLoading}
      />

      <SegmentedControl
        label="Soy"
        options={ROLE_OPTIONS}
        value={role}
        onChange={setRole}
        disabled={isLoading}
      />

      <PrimaryButton
        label="Crear cuenta"
        onPress={handleRegister}
        loading={isLoading}
        style={styles.submit}
      />

      <TouchableOpacity
        style={styles.linkButton}
        onPress={goToLogin}
        disabled={isLoading}
        accessibilityRole="link"
        accessibilityLabel="¿Ya tienes cuenta? Inicia sesión"
      >
        <Text style={[styles.linkText, { color: theme.gray[700] }]}>
          ¿Ya tienes cuenta? <Text style={[styles.linkStrong, { color: theme.primary }]}>Inicia sesión</Text>
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
