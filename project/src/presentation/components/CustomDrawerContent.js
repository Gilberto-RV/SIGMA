import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import { Map, Settings, LogOut, UserRound } from 'lucide-react-native';
import { serviceContainer } from '../../infrastructure/di/ServiceContainer';
import { DIMENSIONS } from '../../core/constants/dimensions';
import { useTheme } from '../../core/context/ThemeContext';

const ROLE_LABELS = {
  estudiante: 'Estudiante',
  profesor: 'Profesor',
  administrador: 'Administrador',
};

/** Inicial del correo para el avatar cuando el usuario no tiene foto. */
export function initialFor(user) {
  return (user?.email || '?').trim().charAt(0).toUpperCase();
}

export default function CustomDrawerContent(props) {
  const { user, state, navigation } = props;
  const router = useRouter();
  const { theme } = useTheme();
  const authUseCases = serviceContainer.get('authUseCases');
  const activeRoute = state?.routes?.[state.index]?.name;

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

  const DrawerItem = ({ icon: Icon, label, route, onPress, color }) => {
    const active = route && route === activeRoute;
    const tint = color || (active ? theme.primary : theme.gray[800]);
    return (
      <TouchableOpacity
        style={[styles.drawerItem, active && { backgroundColor: theme.primarySoft || '#e8f1fa' }]}
        onPress={onPress || (() => navigation.navigate(route))}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: Boolean(active) }}
      >
        <Icon size={22} color={color || theme.primary} style={styles.drawerIcon} />
        <Text style={[styles.drawerLabel, { color: tint }, active && styles.drawerLabelActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.scroll} style={{ backgroundColor: theme.background }}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <View style={styles.avatarContainer}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatarImage} resizeMode="cover" accessibilityIgnoresInvertColors />
          ) : (
            <Text style={[styles.avatarInitial, { color: theme.primary }]}>{initialFor(user)}</Text>
          )}
        </View>
        <Text style={styles.userName} numberOfLines={1}>
          {user?.email || 'Visitante'}
        </Text>
        <Text style={styles.userRole}>{ROLE_LABELS[user?.role] || 'Sin sesión'}</Text>
      </View>

      <View style={styles.menu}>
        <DrawerItem icon={Map} label="Mapa" route="index" />
        <DrawerItem icon={UserRound} label="Mi perfil" route="profile" />
        <DrawerItem icon={Settings} label="Configuración" route="settings" />
      </View>

      <View style={[styles.footer, { borderTopColor: theme.gray[200] }]}>
        <DrawerItem icon={LogOut} label="Cerrar sesión" onPress={handleLogout} color={theme.error} />
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
  },
  // El encabezado empieza debajo de la barra de estado (sus íconos son oscuros).
  header: {
    paddingHorizontal: DIMENSIONS.spacing.lg,
    paddingVertical: DIMENSIONS.spacing.lg,
    marginHorizontal: DIMENSIONS.spacing.sm,
    marginBottom: DIMENSIONS.spacing.sm,
    borderRadius: DIMENSIONS.borderRadius.xl,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: DIMENSIONS.spacing.md,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 28,
    fontFamily: 'Roboto-Bold',
  },
  userName: {
    fontSize: DIMENSIONS.fontSize.md,
    fontFamily: 'Roboto-Medium',
    color: '#ffffff',
  },
  userRole: {
    fontSize: DIMENSIONS.fontSize.sm,
    fontFamily: 'Roboto-Regular',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  menu: {
    flex: 1,
    paddingHorizontal: DIMENSIONS.spacing.sm,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: DIMENSIONS.spacing.md,
    marginVertical: 2,
    borderRadius: DIMENSIONS.borderRadius.lg,
  },
  drawerIcon: {
    marginRight: DIMENSIONS.spacing.md,
  },
  drawerLabel: {
    fontSize: DIMENSIONS.fontSize.md,
    fontFamily: 'Roboto-Regular',
  },
  drawerLabelActive: {
    fontFamily: 'Roboto-Bold',
  },
  footer: {
    paddingHorizontal: DIMENSIONS.spacing.sm,
    paddingVertical: DIMENSIONS.spacing.md,
    borderTopWidth: 1,
  },
});
