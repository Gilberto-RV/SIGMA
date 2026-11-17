import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Smartphone, ShieldCheck, MapPin } from 'lucide-react-native';

let NativeMapComponent = null;

if (Platform.OS !== 'web') {
  try {
    const MapLibreRN = require('@maplibre/maplibre-react-native');
    NativeMapComponent = MapLibreRN.Map || MapLibreRN.MapView;
  } catch (e) {
    console.warn('[MapLibre Native Test] No se pudo cargar el modulo nativo:', e.message);
  }
}

export default function MapLibreNativeTestScreen() {
  const router = useRouter();
  const [mapLoaded, setMapLoaded] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Visor MapLibre Native (Android Test)</Text>
          <Text style={styles.headerSubtitle}>Etapa 3: @maplibre/maplibre-react-native</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>NATIVE</Text>
        </View>
      </View>

      {/* Contenido Principal */}
      <View style={styles.mainContainer}>
        {Platform.OS === 'web' ? (
          <View style={styles.webFallbackContainer}>
            <Smartphone size={48} color="#0284c7" />
            <Text style={styles.webFallbackTitle}>Visor Nativo Exclusivo para Móvil</Text>
            <Text style={styles.webFallbackText}>
              La librería @maplibre/maplibre-react-native requiere código nativo C++/Java (Android / iOS)
              y un Development Build.
            </Text>
            <View style={styles.webFallbackInfoCard}>
              <ShieldCheck size={18} color="#10b981" />
              <Text style={styles.webFallbackInfoText}>
                El visor Webgl para navegadores permanece 100% funcional en la ruta /maplibre-test.
              </Text>
            </View>
            <TouchableOpacity style={styles.navWebBtn} onPress={() => router.push('/maplibre-test')}>
              <Text style={styles.navWebBtnText}>Ir a /maplibre-test (Visor Web)</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.nativeMapContainer}>
            {NativeMapComponent ? (
              <NativeMapComponent
                style={styles.map}
                mapStyle="https://demotiles.maplibre.org/style.json"
                onDidFinishLoadingMap={() => setMapLoaded(true)}
              />
            ) : (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>No se pudo instanciar el componente nativo MapLibre.</Text>
              </View>
            )}

            <View style={styles.statusCard}>
              <MapPin size={16} color={mapLoaded ? '#10b981' : '#f59e0b'} />
              <Text style={styles.statusCardText}>
                MapLibre Native: {mapLoaded ? 'Cargado exitosamente' : 'Inicializando...'}
              </Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    height: 56,
    backgroundColor: '#043c55',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#0f2b38',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
  },
  statusBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mainContainer: {
    flex: 1,
    position: 'relative',
  },
  webFallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0f172a',
  },
  webFallbackTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  webFallbackText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    maxWidth: 400,
    lineHeight: 20,
    marginBottom: 20,
  },
  webFallbackInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 24,
    maxWidth: 420,
  },
  webFallbackInfoText: {
    color: '#6ee7b7',
    fontSize: 12,
    flex: 1,
  },
  navWebBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  navWebBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  nativeMapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
  statusCard: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusCardText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
});
