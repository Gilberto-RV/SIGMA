import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Menu } from 'lucide-react-native';
import { DIMENSIONS } from '../../core/constants/dimensions';
import { useTheme } from '../../core/context/ThemeContext';

export default function MapHeader() {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const handleMenuPress = () => {
    navigation.openDrawer();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
        <Menu size={22} color="#ffffff" />
      </TouchableOpacity>
      
      <Text style={styles.title}>{theme.appName}</Text>
      
      <View style={styles.placeholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 48, // Altura fija ultra-compacta y elegante
  },
  menuButton: {
    padding: 6,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 34, // Ancho coincidente con el botón de menú para centrado exacto del título
  },
});