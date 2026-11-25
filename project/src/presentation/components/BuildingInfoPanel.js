import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import {
  X, Accessibility, Layers, DoorOpen, Users, Toilet, Library, GraduationCap, Footprints, Navigation, Flag,
} from 'lucide-react-native';
import { DIMENSIONS } from '../../core/constants/dimensions';
import { MIN_TOUCH_TARGET } from '../../core/constants/colors';
import { useTheme } from '../../core/context/ThemeContext';
import PrimaryButton from './PrimaryButton';

/** La BD guarda la afluencia en español ("Media") y el código antiguo esperaba "medium". */
function normalizeFrequency(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'high' || v === 'alta') return 'alta';
  if (v === 'medium' || v === 'media') return 'media';
  if (v === 'low' || v === 'baja') return 'baja';
  return null;
}

export function formatDistance(meters) {
  if (!Number.isFinite(meters)) return null;
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatWalkingTime(seconds) {
  if (!Number.isFinite(seconds)) return null;
  return `${Math.max(1, Math.round(seconds / 60))} min a pie`;
}

function Chip({ icon: Icon, label, color, background }) {
  return (
    <View style={[styles.chip, { backgroundColor: background }]}>
      <Icon size={14} color={color} />
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

function Section({ icon: Icon, title, color, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Icon size={16} color={color} />
        <Text style={[styles.sectionTitle, { color }]} accessibilityRole="header">{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function BuildingInfoPanel({
  building,
  onClose,
  onRoutePress,
  routeResult = null,
  navigationState = null,
  onStartNavigation = null,
  onStopNavigation = null,
  isAccessibleRoute = false,
  isRouting = false,
}) {
  const { theme } = useTheme();
  if (!building) return null;

  const isNavigating = navigationState?.isNavigating;
  const isFinished = navigationState?.status === 'finished';
  const frequency = normalizeFrequency(building.student_frequency);
  const frequencyColor = frequency === 'alta' ? theme.error : frequency === 'media' ? theme.warning : theme.success;
  const bathroomFloors = Object.entries(building.bathrooms || {})
    .filter(([, value]) => value === true)
    .map(([floor]) => floor.replace('floor_', ''));

  const distance = formatDistance(
    isNavigating && Number.isFinite(navigationState?.distanceToDestinationMeters)
      ? navigationState.distanceToDestinationMeters
      : routeResult?.distanceMeters
  );
  const duration = formatWalkingTime(routeResult?.durationSeconds);
  const muted = theme.gray[700];

  return (
    <View style={styles.container}>
      <View style={[styles.handle, { backgroundColor: theme.gray[300] }]} />

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header" numberOfLines={2}>
            {building.name}
          </Text>
          {building.description ? (
            <Text style={[styles.description, { color: muted }]} numberOfLines={2}>
              {building.description}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel={`Cerrar información de ${building.name}`}
        >
          <X size={24} color={muted} />
        </TouchableOpacity>
      </View>

      <View style={styles.chips}>
        {building.floors ? (
          <Chip
            icon={Layers}
            label={`${building.floors} ${building.floors === 1 ? 'planta' : 'plantas'}`}
            color={theme.primary}
            background={theme.primarySoft || '#e8f1fa'}
          />
        ) : null}
        {building.isAccessible ? (
          <Chip icon={Accessibility} label="Accesible" color={theme.success} background="#e8f5e9" />
        ) : null}
        <Chip
          icon={DoorOpen}
          label={building.availability ? 'Disponible' : 'No disponible'}
          color={building.availability ? theme.success : theme.error}
          background={building.availability ? '#e8f5e9' : '#fdecea'}
        />
        {frequency ? (
          <Chip icon={Users} label={`Afluencia ${frequency}`} color={frequencyColor} background={theme.gray[100]} />
        ) : null}
      </View>

      {routeResult && (
        <View
          style={[styles.routeCard, { backgroundColor: theme.primarySoft || '#e8f1fa' }]}
          accessible
          accessibilityLabel={`Ruta: ${distance || ''}${duration ? `, ${duration}` : ''}${isAccessibleRoute ? ', ruta inclusiva activada' : ''}`}
        >
          <Footprints size={22} color={theme.primary} />
          <View style={styles.routeText}>
            <Text style={[styles.routeMain, { color: theme.primary }]}>
              {isNavigating ? `Faltan ${distance}` : [distance, duration].filter(Boolean).join(' · ')}
            </Text>
            {isAccessibleRoute ? (
              <Text style={[styles.routeSub, { color: theme.gray[800] }]}>
                Ruta inclusiva: evita los tramos con escaleras o pendientes registrados.
              </Text>
            ) : (
              <Text style={[styles.routeSub, { color: theme.gray[800] }]}>Hasta la entrada del edificio</Text>
            )}
          </View>
          {isAccessibleRoute ? <Accessibility size={20} color={theme.primary} /> : null}
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {building.media ? <Image source={{ uri: building.media }} style={styles.image} accessibilityIgnoresInvertColors /> : null}

        {bathroomFloors.length > 0 && (
          <Section icon={Toilet} title="Baños" color={theme.gray[800]}>
            <Text style={[styles.text, { color: muted }]}>
              {bathroomFloors.length === 1 ? 'Planta ' : 'Plantas '}
              {bathroomFloors.join(', ')}
            </Text>
          </Section>
        )}

        {building.facilities && building.facilities.length > 0 && (
          <Section icon={Library} title="Servicios" color={theme.gray[800]}>
            {building.facilities.map((service, i) => (
              <Text key={i} style={[styles.text, { color: muted }]}>• {service.name || service}</Text>
            ))}
          </Section>
        )}

        {building.careers && building.careers.length > 0 && (
          <Section icon={GraduationCap} title="Carreras" color={theme.gray[800]}>
            {building.careers.map((career, i) => (
              <Text key={i} style={[styles.text, { color: muted }]}>• {career.name || career}</Text>
            ))}
          </Section>
        )}

        {building.entrances && building.entrances.length > 0 && (
          <Section
            icon={DoorOpen}
            title={building.entrances.length === 1 ? 'Entrada' : `${building.entrances.length} entradas`}
            color={theme.gray[800]}
          >
            {building.entrances.map((e, i) => (
              <View key={i} style={styles.entrance}>
                {e.description ? <Text style={[styles.text, { color: theme.gray[800] }]}>{e.description}</Text> : null}
                {e.location_hint ? (
                  <Text style={[styles.text, { color: muted }]}>Ubicación: {e.location_hint}</Text>
                ) : null}
              </View>
            ))}
          </Section>
        )}

        {building.subjects && building.subjects.length > 0 && (
          <Section icon={Flag} title="Espacios académicos" color={theme.gray[800]}>
            {building.subjects.map((room, i) => (
              <Text key={i} style={[styles.text, { color: muted }]}>
                • {room.name} ({room.floor === 5 ? 'distribuidos en el edificio' : `piso ${room.floor}`})
              </Text>
            ))}
          </Section>
        )}
      </ScrollView>

      <View style={styles.actions}>
        {isNavigating ? (
          <PrimaryButton label="Detener navegación" onPress={onStopNavigation} color={theme.error} />
        ) : isFinished ? (
          <PrimaryButton label="Llegaste · Calcular de nuevo" onPress={onRoutePress} color={theme.success} />
        ) : routeResult ? (
          <PrimaryButton label="Iniciar navegación" icon={Navigation} onPress={onStartNavigation} color={theme.success} />
        ) : (
          <PrimaryButton label="Cómo llegar" icon={Footprints} onPress={onRoutePress} loading={isRouting} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: DIMENSIONS.spacing.lg,
    paddingTop: DIMENSIONS.spacing.sm,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: DIMENSIONS.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
    paddingTop: 4,
  },
  title: {
    fontSize: DIMENSIONS.fontSize.xl,
    fontFamily: 'Roboto-Bold',
  },
  description: {
    fontSize: DIMENSIONS.fontSize.sm,
    fontFamily: 'Roboto-Regular',
    marginTop: 2,
  },
  closeButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DIMENSIONS.spacing.sm,
    marginTop: DIMENSIONS.spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: {
    marginLeft: 6,
    fontSize: 13,
    fontFamily: 'Roboto-Medium',
  },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: DIMENSIONS.borderRadius.lg,
    padding: DIMENSIONS.spacing.md,
    marginTop: DIMENSIONS.spacing.md,
  },
  routeText: {
    flex: 1,
    marginHorizontal: DIMENSIONS.spacing.md,
  },
  routeMain: {
    fontSize: DIMENSIONS.fontSize.lg,
    fontFamily: 'Roboto-Bold',
  },
  routeSub: {
    fontSize: 13,
    fontFamily: 'Roboto-Regular',
    marginTop: 2,
  },
  content: {
    flex: 1,
    marginTop: DIMENSIONS.spacing.sm,
  },
  image: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
    borderRadius: DIMENSIONS.borderRadius.lg,
    marginTop: DIMENSIONS.spacing.sm,
  },
  section: {
    marginTop: DIMENSIONS.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    marginLeft: DIMENSIONS.spacing.sm,
    fontSize: DIMENSIONS.fontSize.md,
    fontFamily: 'Roboto-Medium',
  },
  text: {
    fontSize: DIMENSIONS.fontSize.sm,
    fontFamily: 'Roboto-Regular',
    lineHeight: 20,
    marginLeft: 24,
  },
  entrance: {
    marginBottom: 6,
  },
  actions: {
    paddingTop: DIMENSIONS.spacing.sm,
  },
});
