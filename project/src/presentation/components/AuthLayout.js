import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPinned } from 'lucide-react-native';
import { DIMENSIONS } from '../../core/constants/dimensions';
import { useTheme } from '../../core/context/ThemeContext';

/**
 * Estructura común de inicio de sesión y registro: marca del tema activo arriba y el formulario
 * dentro de un ScrollView. Antes el contenido se centraba en un KeyboardAvoidingView y, al abrir
 * el teclado en Android, el título quedaba debajo de la barra de estado.
 */
export default function AuthLayout({ title, subtitle, children, compact = false }) {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* compact: marca en una fila, para que formularios largos (registro) quepan sin desplazar. */}
          <View style={compact ? styles.brandCompact : styles.brand} accessibilityRole="header">
            <View style={[compact ? styles.logoCompact : styles.logo, { backgroundColor: theme.primary }]}>
              <MapPinned size={compact ? 24 : 34} color="#ffffff" />
            </View>
            <View style={compact ? styles.brandTextCompact : null}>
              <Text style={[compact ? styles.appNameCompact : styles.appName, { color: theme.primary }, !compact && styles.center]}>
                {theme.appName}
              </Text>
              <Text style={[styles.tagline, { color: theme.gray[700] }, !compact && styles.center]}>Guía del campus</Text>
            </View>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: theme.gray[700] }]}>{subtitle}</Text> : null}

          {children}
        </ScrollView>
      </KeyboardAvoidingView>
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
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: DIMENSIONS.spacing.lg,
    paddingVertical: DIMENSIONS.spacing.xl,
  },
  brand: {
    alignItems: 'center',
    marginBottom: DIMENSIONS.spacing.xl,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DIMENSIONS.spacing.md,
  },
  appName: {
    fontSize: DIMENSIONS.fontSize.xxl,
    fontFamily: 'Roboto-Bold',
  },
  center: {
    textAlign: 'center',
  },
  brandCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: DIMENSIONS.spacing.lg,
  },
  logoCompact: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTextCompact: {
    marginLeft: DIMENSIONS.spacing.md,
  },
  appNameCompact: {
    fontSize: DIMENSIONS.fontSize.lg,
    fontFamily: 'Roboto-Bold',
  },
  tagline: {
    fontSize: DIMENSIONS.fontSize.sm,
    fontFamily: 'Roboto-Regular',
    marginTop: 2,
  },
  title: {
    fontSize: DIMENSIONS.fontSize.xl,
    fontFamily: 'Roboto-Bold',
    marginBottom: DIMENSIONS.spacing.xs,
  },
  subtitle: {
    fontSize: DIMENSIONS.fontSize.sm,
    fontFamily: 'Roboto-Regular',
    marginBottom: DIMENSIONS.spacing.lg,
  },
});
