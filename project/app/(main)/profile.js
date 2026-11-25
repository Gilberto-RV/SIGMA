import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LogOut, Trash2 } from 'lucide-react-native';
import { DIMENSIONS } from '../../src/core/constants/dimensions';
import { serviceContainer } from '../../src/infrastructure/di/ServiceContainer';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/core/context/ThemeContext';
import MapHeader from '../../src/presentation/components/MapHeader';
import FormField from '../../src/presentation/components/FormField';
import PrimaryButton from '../../src/presentation/components/PrimaryButton';
import { initialFor } from '../../src/presentation/components/CustomDrawerContent';

const ROLE_LABELS = {
  estudiante: 'Estudiante',
  profesor: 'Profesor',
  administrador: 'Administrador',
};

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [editableUser, setEditableUser] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();
  const authUseCases = serviceContainer.get('authUseCases');
  const { updateProfile, changePassword, deleteAccount } = useAuth();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await authUseCases.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setEditableUser({ ...currentUser, password: '', currentPassword: '' }); // No mostrar password real
        setAvatarFailed(false);
      } else {
        router.replace('/auth');
      }
    } catch (error) {
      console.error('Error al cargar usuario:', error);
      Alert.alert('Error', 'No se pudo cargar la información del usuario');
      router.replace('/auth');
    }
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          try {
            await authUseCases.logout();
            router.replace('/auth');
          } catch (error) {
            console.error('Error al cerrar sesión:', error);
            Alert.alert('Error', 'No se pudo cerrar la sesión');
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert('Eliminar cuenta', 'Se borrará tu cuenta y no podrás recuperarla. ¿Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccount();
            router.replace('/auth');
          } catch (error) {
            console.error('Error al eliminar cuenta:', error);
            Alert.alert('Error', 'No se pudo eliminar la cuenta');
          }
        },
      },
    ]);
  };

  const handleUpdateProfile = async () => {
    try {
      setIsUpdating(true);

      const newPassword = editableUser.password?.trim();
      if (newPassword && !editableUser.currentPassword) {
        Alert.alert('Contraseña', 'Escribe tu contraseña actual para cambiarla.');
        return;
      }

      // El rol no se cambia desde el perfil: lo asigna el registro o un administrador.
      await updateProfile({ avatar: editableUser.avatar });
      if (newPassword) {
        await changePassword(editableUser.currentPassword, newPassword);
      }
      Alert.alert('Listo', 'Tu perfil se actualizó.');
      await loadUser();
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      Alert.alert('Error', error?.message || 'No se pudo actualizar el perfil');
    } finally {
      setIsUpdating(false);
    }
  };

  const showAvatarImage = Boolean(editableUser?.avatar) && !avatarFailed;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <MapHeader title="Mi perfil" />

      {!editableUser ? (
        <View style={styles.loadingContainer} accessibilityRole="progressbar" accessibilityLabel="Cargando perfil">
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.gray[700] }]}>Cargando perfil…</Text>
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.identity}>
              <View style={[styles.avatar, { backgroundColor: theme.primarySoft || '#e8f1fa' }]}>
                {showAvatarImage ? (
                  <Image
                    source={{ uri: editableUser.avatar }}
                    style={styles.avatarImage}
                    onError={() => setAvatarFailed(true)}
                    accessibilityLabel="Foto de perfil"
                  />
                ) : (
                  <Text style={[styles.avatarInitial, { color: theme.primary }]}>{initialFor(user)}</Text>
                )}
              </View>
              <Text style={[styles.email, { color: theme.text }]} numberOfLines={1}>{user?.email}</Text>
              <View style={[styles.roleBadge, { backgroundColor: theme.primarySoft || '#e8f1fa' }]}>
                <Text style={[styles.roleText, { color: theme.primary }]}>{ROLE_LABELS[user?.role] || user?.role}</Text>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: theme.gray[800] }]} accessibilityRole="header">
              Foto de perfil
            </Text>
            <FormField
              label="Enlace de la imagen"
              hint="Una URL que termine en .jpg o .png"
              placeholder="https://…/foto.jpg"
              value={editableUser.avatar || ''}
              onChangeText={(text) => {
                setAvatarFailed(false);
                setEditableUser({ ...editableUser, avatar: text });
              }}
              autoCapitalize="none"
              keyboardType="url"
            />

            <Text style={[styles.sectionTitle, { color: theme.gray[800] }]} accessibilityRole="header">
              Cambiar contraseña
            </Text>
            <FormField
              label="Contraseña actual"
              hint="Solo es necesaria si vas a cambiar la contraseña"
              secureTextEntry
              autoComplete="password"
              value={editableUser.currentPassword}
              onChangeText={(text) => setEditableUser({ ...editableUser, currentPassword: text })}
            />
            <FormField
              label="Nueva contraseña"
              secureTextEntry
              autoComplete="new-password"
              value={editableUser.password}
              onChangeText={(text) => setEditableUser({ ...editableUser, password: text })}
            />

            <PrimaryButton
              label="Guardar cambios"
              onPress={handleUpdateProfile}
              loading={isUpdating}
              style={styles.saveButton}
            />

            <View style={[styles.divider, { backgroundColor: theme.gray[200] }]} />

            <PrimaryButton label="Cerrar sesión" icon={LogOut} variant="outline" onPress={handleLogout} />
            <PrimaryButton
              label="Eliminar cuenta"
              icon={Trash2}
              variant="danger-text"
              onPress={handleDeleteAccount}
              accessibilityHint="Pide confirmación antes de borrar la cuenta"
              style={styles.deleteButton}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
  },
  content: {
    padding: DIMENSIONS.spacing.lg,
    paddingBottom: DIMENSIONS.spacing.xxl,
  },
  identity: {
    alignItems: 'center',
    marginBottom: DIMENSIONS.spacing.lg,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: DIMENSIONS.spacing.md,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 40,
    fontFamily: 'Roboto-Bold',
  },
  email: {
    fontSize: DIMENSIONS.fontSize.lg,
    fontFamily: 'Roboto-Medium',
  },
  roleBadge: {
    marginTop: DIMENSIONS.spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  roleText: {
    fontSize: 13,
    fontFamily: 'Roboto-Medium',
  },
  sectionTitle: {
    fontSize: DIMENSIONS.fontSize.md,
    fontFamily: 'Roboto-Bold',
    marginTop: DIMENSIONS.spacing.md,
    marginBottom: DIMENSIONS.spacing.sm,
  },
  saveButton: {
    marginTop: DIMENSIONS.spacing.sm,
  },
  divider: {
    height: 1,
    marginVertical: DIMENSIONS.spacing.lg,
  },
  deleteButton: {
    marginTop: DIMENSIONS.spacing.sm,
  },
});
