import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Menu } from 'lucide-react-native';
import { useTheme } from '../../core/context/ThemeContext';
import { MIN_TOUCH_TARGET } from '../../core/constants/colors';

/**
 * Barra superior con el botón del menú lateral. Sin `title` muestra el nombre de la app
 * (pantalla del mapa); Perfil y Configuración la usan con su propio título para que todas
 * las pantallas tengan la misma navegación.
 */
export default function MapHeader({ title }) {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const handleMenuPress = () => {
    navigation.openDrawer();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={handleMenuPress}
        accessibilityRole="button"
        accessibilityLabel="Abrir menú"
      >
        <Menu size={24} color="#ffffff" />
      </TouchableOpacity>

      <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
        {title || theme.appName}
      </Text>

      <View style={styles.placeholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    height: 56,
  },
  menuButton: {
    width: MIN_TOUCH_TARGET + 4,
    height: MIN_TOUCH_TARGET + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: MIN_TOUCH_TARGET + 4, // mismo ancho que el botón de menú para centrar el título
  },
});
