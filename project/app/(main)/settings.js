import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Bell, MapPin, Accessibility, Check } from 'lucide-react-native';
import { COLORS } from '../../src/core/constants/colors';
import { DIMENSIONS } from '../../src/core/constants/dimensions';
import { useTheme } from '../../src/core/context/ThemeContext';
import MapHeader from '../../src/presentation/components/MapHeader';

export default function SettingsScreen() {
  const { theme, setThemeById, THEMES } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [locationSharing, setLocationSharing] = useState(false);
  const [accessibilityMode, setAccessibilityMode] = useState(false);

  const SettingItem = ({ icon: Icon, title, description, value, onValueChange }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <Icon size={24} color={theme.primary} style={styles.settingIcon} />
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.gray[400], true: theme.primary }}
        thumbColor={value ? '#ffffff' : theme.gray[100]}
        accessibilityLabel={title}
        accessibilityHint={description}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <MapHeader title="Configuración" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]} accessibilityRole="header">Tema de color</Text>
          <Text style={[styles.sectionHint, { color: theme.gray[700] }]}>
            Cambia los colores y el nombre que muestra la app.
          </Text>
          <View style={styles.themeSelectorContainer} accessibilityRole="radiogroup">
            {Object.values(THEMES).map((item) => {
              const isActive = theme.id === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.themeCard,
                    isActive && { borderColor: item.primary, borderWidth: 2 }
                  ]}
                  onPress={() => setThemeById(item.id)}
                  accessibilityRole="radio"
                  accessibilityLabel={`Tema ${item.name}`}
                  accessibilityState={{ checked: isActive }}
                >
                  <View style={[styles.colorPreview, { backgroundColor: item.primary }]}>
                    <View style={[styles.colorAccent, { backgroundColor: item.secondary }]} />
                    {isActive ? (
                      <View style={styles.checkOverlay}>
                        <Check size={18} color="#ffffff" />
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.themeCardText, isActive && { color: item.primary }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]} accessibilityRole="header">Preferencias</Text>
          
          <SettingItem
            icon={Bell}
            title="Notificaciones"
            description="Recibir notificaciones de eventos y actualizaciones"
            value={notifications}
            onValueChange={setNotifications}
          />

          <SettingItem
            icon={MapPin}
            title="Compartir ubicación"
            description="Permitir compartir tu ubicación para mejores rutas"
            value={locationSharing}
            onValueChange={setLocationSharing}
          />

          <SettingItem
            icon={Accessibility}
            title="Modo accesibilidad"
            description="Priorizar rutas con rampas y accesos inclusivos"
            value={accessibilityMode}
            onValueChange={setAccessibilityMode}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]} accessibilityRole="header">Información</Text>

          {/* Eran botones sin acción; ahora son texto informativo. */}
          <View style={styles.infoItem} accessible>
            <Text style={styles.infoTitle}>Acerca de</Text>
            <Text style={styles.infoDescription}>{theme.appName} v1.0.0</Text>
          </View>

          <View style={styles.infoItem} accessible>
            <Text style={styles.infoTitle}>Soporte</Text>
            <Text style={styles.infoDescription}>Equipo técnico de {theme.appName}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    padding: DIMENSIONS.spacing.lg,
    paddingBottom: DIMENSIONS.spacing.xxl,
  },
  section: {
    marginBottom: DIMENSIONS.spacing.xl,
  },
  sectionTitle: {
    fontSize: DIMENSIONS.fontSize.lg,
    fontFamily: 'Roboto-Bold',
    marginBottom: DIMENSIONS.spacing.xs,
  },
  sectionHint: {
    fontSize: DIMENSIONS.fontSize.sm,
    fontFamily: 'Roboto-Regular',
    marginBottom: DIMENSIONS.spacing.md,
  },
  themeSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: DIMENSIONS.spacing.xs,
    marginBottom: DIMENSIONS.spacing.md,
  },
  themeCard: {
    flex: 1,
    minHeight: 104,
    backgroundColor: '#ffffff',
    borderRadius: DIMENSIONS.borderRadius.lg,
    padding: DIMENSIONS.spacing.sm,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#e0e0e0',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  colorPreview: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: DIMENSIONS.spacing.xs,
    position: 'relative',
    overflow: 'hidden',
  },
  colorAccent: {
    width: 18,
    height: 36,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  checkOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  themeCardText: {
    fontSize: 12,
    fontFamily: 'Roboto-Medium',
    textAlign: 'center',
    color: '#424242',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: DIMENSIONS.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: DIMENSIONS.spacing.md,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: DIMENSIONS.fontSize.md,
    fontFamily: 'Roboto-Medium',
    color: COLORS.gray[800],
    marginBottom: DIMENSIONS.spacing.xs,
  },
  settingDescription: {
    fontSize: DIMENSIONS.fontSize.sm,
    fontFamily: 'Roboto-Regular',
    color: COLORS.gray[600],
  },
  infoItem: {
    paddingVertical: DIMENSIONS.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  infoTitle: {
    fontSize: DIMENSIONS.fontSize.md,
    fontFamily: 'Roboto-Medium',
    color: COLORS.gray[800],
    marginBottom: DIMENSIONS.spacing.xs,
  },
  infoDescription: {
    fontSize: DIMENSIONS.fontSize.sm,
    fontFamily: 'Roboto-Regular',
    color: COLORS.gray[600],
  },
});