import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, School, Layers, CheckCircle2, Navigation } from 'lucide-react-native';
// SigmaMap se resuelve por plataforma (web: maplibre-gl, Android: MapLibre nativo).
import { SigmaMap } from '../src/presentation/components/map';
import edificios from '../assets/geo/Edificios.json';
import caminos from '../assets/geo/caminos.json';
import entradas from '../assets/geo/Entradas.json';
import perimetroCampus from '../assets/geo/PerimetroCampus.json';
import { isMapTilerConfigured } from '../src/core/config/mapConfig';

// Ruta sintética de prueba exclusivamente para validación visual de la prop routeResult
const SYNTHETIC_TEST_ROUTE = {
  coordinates: [
    { latitude: 19.407191, longitude: -98.121074 }, // EP-003 (Entrada Principal)
    { latitude: 19.407403, longitude: -98.120367 }, // EE-12 (Edificio L)
    { latitude: 19.407803, longitude: -98.120412 }, // EE-14 (Edificio N)
    { latitude: 19.408055, longitude: -98.120449 }, // EE-16 (Edificio O)
  ],
  distanceMeters: 380,
  durationSeconds: 210,
  provider: 'hybrid',
  metadata: {
    isHybrid: true,
    selectedEntryPoint: { id: 'EP-003', name: 'Entrada Principal (EP-003)' },
    segments: [
      { provider: 'osrm', distanceMeters: 120, durationSeconds: 60 },
      { provider: 'dijkstra', distanceMeters: 260, durationSeconds: 150 },
    ],
  },
};

export default function MapLibreTestScreen() {
  const router = useRouter();
  const mapRef = useRef(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [activeRouteResult, setActiveRouteResult] = useState(null);
  const isConfigured = isMapTilerConfigured();

  const handleBuildingPress = (feature) => {
    const props = feature.properties || {};
    setSelectedBuilding({
      id: props.id || feature.id,
      name: props.name || 'Edificio',
      tipo: props.tipo || 'EDIFICIO',
      conexiones: props.conexiones,
    });
  };

  const handleMapPress = () => {
    setSelectedBuilding(null);
  };

  const toggleTestRoute = () => {
    if (activeRouteResult) {
      setActiveRouteResult(null);
    } else {
      setActiveRouteResult(SYNTHETIC_TEST_ROUTE);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Barra superior de prueba */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Visor Web SIGMA (MapLibre Test)</Text>
          <Text style={styles.headerSubtitle}>Etapa 4D.2: Renderizado Dinámico de RouteResult</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>WEBGL</Text>
        </View>
      </View>

      {/* Contenedor del Mapa */}
      <View style={styles.mapContainer}>
        <SigmaMap
          ref={mapRef}
          buildings={edificios}
          paths={caminos}
          entrances={entradas}
          campusBoundary={perimetroCampus}
          selectedBuilding={selectedBuilding?.id}
          onBuildingPress={handleBuildingPress}
          onMapPress={handleMapPress}
          routeResult={activeRouteResult}
          style={styles.map}
        />

        {/* Tarjeta de estado de configuración */}
        <View style={styles.configCard}>
          <View style={styles.configRow}>
            <CheckCircle2 size={16} color={isConfigured ? '#10b981' : '#f59e0b'} />
            <Text style={styles.configText}>
              MapTiler Key: {isConfigured ? 'Configurada en .env.local' : 'No configurada'}
            </Text>
          </View>
          <TouchableOpacity style={styles.routeToggleBtn} onPress={toggleTestRoute}>
            <Navigation size={14} color="#ffffff" />
            <Text style={styles.routeToggleBtnText}>
              {activeRouteResult ? 'Limpiar Ruta (null)' : 'Probar RouteResult (GeoJSON)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Panel lateral / inferior flotante con datos del edificio seleccionado */}
        {selectedBuilding && (
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <School size={18} color="#043c55" />
              <Text style={styles.infoCardTitle}>{selectedBuilding.name}</Text>
            </View>
            <Text style={styles.infoCardSub}>ID: {selectedBuilding.id} • Tipo: {selectedBuilding.tipo}</Text>
            {selectedBuilding.conexiones && (
              <View style={styles.connectionTag}>
                <Layers size={13} color="#0284c7" />
                <Text style={styles.connectionText}>
                  Conexiones: {typeof selectedBuilding.conexiones === 'string' ? selectedBuilding.conexiones : JSON.stringify(selectedBuilding.conexiones)}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.closeCardBtn} onPress={() => setSelectedBuilding(null)}>
              <Text style={styles.closeCardBtnText}>Deseleccionar</Text>
            </TouchableOpacity>
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
    backgroundColor: '#0284c7',
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
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  configCard: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  configText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  routeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 4,
  },
  routeToggleBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  infoCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  infoCardSub: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  connectionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  connectionText: {
    color: '#0284c7',
    fontSize: 11,
    fontWeight: '600',
  },
  closeCardBtn: {
    backgroundColor: '#043c55',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  closeCardBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
