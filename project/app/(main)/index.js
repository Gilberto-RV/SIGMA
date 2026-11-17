import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, Text, Dimensions, Alert, ScrollView, Animated, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import edificios from '../../assets/geo/Edificios.json';
import caminos from '../../assets/geo/caminos.json';
import entradas from '../../assets/geo/Entradas.json';
import perimetroCampus from '../../assets/geo/PerimetroCampus.json';
import { buildGraph } from '../../src/core/utils/graphUtils';
import { SigmaMap } from '../../src/presentation/components/map';

import MapHeader from '../../src/presentation/components/MapHeader';
import SearchBar from '../../src/presentation/components/SearchBar';
import BuildingInfoPanel from '../../src/presentation/components/BuildingInfoPanel';
import EventsCarousel from '../../src/presentation/components/EventsCarousel';
import { serviceContainer } from '../../src/infrastructure/di/ServiceContainer';
import { COLORS } from '../../src/core/constants/colors';
import { DIMENSIONS } from '../../src/core/constants/dimensions';
import { useTheme } from '../../src/core/context/ThemeContext';
import { X, Calendar, LocateFixed } from 'lucide-react-native';

const windowHeight = Dimensions.get('window').height;

const ENTRADA_PRINCIPAL_COORDS = {
  latitude: 19.40719130839912,
  longitude: -98.12107448617152,
};

// Niveles de zoom MapLibre equivalentes a los deltas usados con react-native-maps.
const ZOOM_BUILDING = 17; // ~0.003°
const ZOOM_CLOSE = 17.5; // ~0.002°
const ZOOM_NAVIGATION = 18;

export default function MapScreen() {
  const { theme } = useTheme();
  const mapRef = useRef(null);
  const locationSubscriptionRef = useRef(null);

  const [buildings, setBuildings] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBuildings, setFilteredBuildings] = useState([]);
  const [routeResult, setRouteResult] = useState(null);
  const [isRouting, setIsRouting] = useState(false);
  const [graph, setGraph] = useState({});
  const [nodeCoords, setNodeCoords] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAccessibilityActive, setIsAccessibilityActive] = useState(false);
  const [showEventsPanel, setShowEventsPanel] = useState(true);
  const [isInsideCampus, setIsInsideCampus] = useState(true);
  const [isSimulatedUser, setIsSimulatedUser] = useState(false);

  const eventUseCases = serviceContainer.get('eventUseCases');
  const buildingUseCases = serviceContainer.get('buildingUseCases');
  
  const routingService = useMemo(() => {
    try {
      return serviceContainer.get('routingService');
    } catch (e) {
      return null;
    }
  }, []);

  const campusAccessService = useMemo(() => {
    try {
      return serviceContainer.get('campusAccessService');
    } catch (e) {
      return null;
    }
  }, []);

  const navigationService = useMemo(() => {
    try {
      return serviceContainer.get('navigationService');
    } catch (e) {
      return null;
    }
  }, []);

  const [navigationState, setNavigationState] = useState({
    status: 'idle',
    isNavigating: false,
    isArrived: false,
    distanceToDestinationMeters: null,
    routeResult: null,
  });
  const panelAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(panelAnimation, {
      toValue: selectedBuilding ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [selectedBuilding]);

  const animatedPanelStyle = {
    transform: [{
      translateY: panelAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [windowHeight * 0.4, 0] 
      })
    }],
    opacity: panelAnimation
  };

  useEffect(() => {
    loadInitialData();
    requestLocationPermission();
    processGeoJSON();

    return () => {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    filterBuildings();
  }, [searchQuery, buildings]);

  const processGeoJSON = async () => {
    try {
      console.log('📍 Cargando datos geográficos modulares...');
      console.log(`  Edificios: ${edificios.features?.length || 0}`);
      console.log(`  Caminos: ${caminos.features?.length || 0}`);
      console.log(`  Entradas: ${entradas.features?.length || 0}`);

      // Combinar entradas y caminos para construir el grafo de navegación
      const allFeatures = [...entradas.features, ...caminos.features];
      const { graph: builtGraph, nodeCoords: builtNodeCoords } = buildGraph(allFeatures);
      setGraph(builtGraph);
      setNodeCoords(builtNodeCoords);

      // Obtener edificios desde MongoDB
      const dbBuildings = await buildingUseCases.getAllBuildings();
      console.log(`  Edificios en BD: ${dbBuildings.length}`);
      
      // Procesar solo los edificios del JSON modular (13 edificios)
      const geoBuildings = edificios.features.map(f => {
        const center = calculateCenterFromPolygon(f.geometry.coordinates[0]);
        const id = f.properties.id;

        // Buscar edificio en MongoDB
        const dbInfo = dbBuildings.find(b => b.id === id || b._id === id);

        // Parsear conexiones si es un string (e.g. '["EE-27"]')
        let conexiones = f.properties.conexiones;
        if (typeof conexiones === 'string') {
          try {
            conexiones = JSON.parse(conexiones);
          } catch (e) {
            conexiones = [];
          }
        }
        const entradaId = Array.isArray(conexiones) ? conexiones[0] : null;

        return {
          id,
          name: dbInfo?.name || f.properties.name || 'Edificio sin nombre',
          description: dbInfo?.description || 'Edificio del campus',
          media: dbInfo?.media || null,
          isAccessible: dbInfo?.accessibility ?? true,
          floors: dbInfo?.floors ?? 1,
          availability: dbInfo?.availability ?? true,
          student_frequency: dbInfo?.student_frequency ?? 'Media',
          bathrooms: dbInfo?.bathrooms || { floor_1: false },
          facilities: dbInfo?.id_services ?? [],
          careers: dbInfo?.id_careers ?? [],
          entrances: dbInfo?.entrances ?? [],
          subjects: dbInfo?.subjects ?? [],
          coordinates: center,
          entradaId: entradaId,
        };
      });
      
      console.log(`✅ ${geoBuildings.length} edificios procesados`);
      setBuildings(geoBuildings);
    } catch (err) {
      console.error('❌ Error procesando GeoJSON:', err);
      Alert.alert('Error', 'No se pudieron cargar los datos del mapa');
    }
  };

  const loadInitialData = async () => {
    // El mapa no depende de los eventos: se muestra de inmediato y el carrusel se llena después.
    setIsLoading(false);
    try {
      const eventsData = await eventUseCases.getActiveEvents();
      setEvents(eventsData);
    } catch (error) {
      console.warn('No se pudieron cargar los eventos:', error?.message);
    }
  };

  const isPointInPolygon = (point, polygon) => {
    if (!point || !polygon || polygon.length === 0) return false;
    const x = point.longitude;
    const y = point.latitude;
    
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      
      const intersect = ((yi > y) !== (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    
    return inside;
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const campusPolygon = perimetroCampus.features[0]?.geometry?.coordinates || [];
      const entradaPrincipalCoords = {
        latitude: 19.40719130839912,
        longitude: -98.12107448617152,
      };

      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const currentCoords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        
        const inside = isPointInPolygon(currentCoords, campusPolygon);
        setIsInsideCampus(inside);
        
        if (inside) {
          setUserLocation(currentCoords);
          setIsSimulatedUser(false);
        } else {
          setUserLocation(entradaPrincipalCoords);
          setIsSimulatedUser(true);
          Alert.alert(
            'Geofencing Activo 🔒',
            'Te encuentras fuera del campus de INNOVATEC. Para tu comodidad y evaluación, se ha activado la simulación situándote en la Entrada Principal del plantel.'
          );
        }

        // Iniciar suscripción en tiempo real para cuando el usuario se desplace
        if (locationSubscriptionRef.current) {
          locationSubscriptionRef.current.remove();
        }

        locationSubscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 2,
          },
          (loc) => {
            const liveCoords = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            };
            const liveInside = isPointInPolygon(liveCoords, campusPolygon);
            if (liveInside) {
              setUserLocation(liveCoords);
              setIsInsideCampus(true);
              setIsSimulatedUser(false);
            }
          }
        );
      } else {
        setUserLocation(entradaPrincipalCoords);
        setIsInsideCampus(false);
        setIsSimulatedUser(true);
      }
    } catch (err) {
      console.warn('Error en geolocalización:', err);
    }
  };

  const filterBuildings = () => {
    if (!searchQuery.trim()) {
      setFilteredBuildings(buildings);
      return;
    }

    const filtered = buildings.filter(building =>
      building.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredBuildings(filtered);
  };

  const calculateCenterFromPolygon = (polygonCoords) => {
    const lats = polygonCoords.map(c => c[1]);
    const lngs = polygonCoords.map(c => c[0]);
    return {
      latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
      longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    };
  };

  /** Mueve la cámara de SigmaMap (web o nativo) a una coordenada { latitude, longitude }. */
  const flyToCoordinate = useCallback((coords, zoom = ZOOM_BUILDING, duration = 500) => {
    if (!coords || !mapRef.current || typeof mapRef.current.flyTo !== 'function') return;
    mapRef.current.flyTo({
      center: [coords.longitude, coords.latitude],
      zoom,
      duration,
    });
  }, []);

  /**
   * Calcula la ruta dinámicamente utilizando RoutingService (OSRM, Dijkstra o Híbrida)
   */
  const calculateAndSetRoute = useCallback(async (targetBuilding, customStartCoords = null) => {
    if (!targetBuilding) return;
    setSelectedBuilding(targetBuilding);

    const startCoords = customStartCoords || userLocation || ENTRADA_PRINCIPAL_COORDS;

    let destinationPoint = targetBuilding.coordinates;
    if (campusAccessService && targetBuilding.id) {
      try {
        const entranceAcc = campusAccessService.getBuildingEntrance(targetBuilding.id);
        if (entranceAcc && entranceAcc.coordinate) {
          destinationPoint = entranceAcc.coordinate;
        }
      } catch (e) {
        // Fallback a coordenadas del edificio si no se especifica puerta
      }
    }

    if (!routingService) {
      console.warn('⚠️ RoutingService no disponible en DI');
      return;
    }

    try {
      setIsRouting(true);
      const result = await routingService.calculateHybridRoute(startCoords, destinationPoint);
      setRouteResult(result);

      if (navigationService) {
        const navState = navigationService.setRoute(result);
        setNavigationState(navState);
      }

      flyToCoordinate(targetBuilding.coordinates, ZOOM_BUILDING, 500);
    } catch (err) {
      const sanitized = (err.message || '').replace(/key=[a-zA-Z0-9_-]+/g, 'key=REDACTED');
      console.warn('⚠️ Error al calcular la ruta:', sanitized);
      setRouteResult(null);
      Alert.alert('Ruta no disponible', `No se pudo calcular una ruta hacia ${targetBuilding.name}.`);
    } finally {
      setIsRouting(false);
    }
  }, [userLocation, routingService, campusAccessService, navigationService, flyToCoordinate]);

  const handleSearch = (query) => {
    setSearchQuery(query);

    const target = buildings.find(b =>
      b.name.toLowerCase().includes(query.toLowerCase())
    );

    if (!target) {
      return;
    }

    calculateAndSetRoute(target);
    filterBuildings();
  };

  const closeInfoPanel = () => {
    setSelectedBuilding(null);
    setRouteResult(null);
    if (navigationService) {
      const navState = navigationService.clearNavigation();
      setNavigationState(navState);
    }
  };

  const handleStartNavigation = useCallback(() => {
    if (!navigationService || !routeResult) return;
    const startPos = userLocation || ENTRADA_PRINCIPAL_COORDS;
    const newState = navigationService.startNavigation(routeResult, startPos);
    setNavigationState(newState);
    flyToCoordinate(startPos, ZOOM_NAVIGATION, 800);
  }, [navigationService, routeResult, userLocation, flyToCoordinate]);

  const handleStopNavigation = useCallback(() => {
    if (!navigationService) return;
    const newState = navigationService.stopNavigation();
    setNavigationState(newState);
  }, [navigationService]);

  useEffect(() => {
    if (navigationService && userLocation && navigationState.isNavigating) {
      const navState = navigationService.updateUserPosition(userLocation);
      setNavigationState(navState);

      if (navState.isArrived && navState.status === 'finished') {
        Alert.alert(
          '🎉 Destino Alcanzado',
          `¡Has llegado a ${selectedBuilding?.name || 'tu destino'}!`
        );
      }
    }
  }, [userLocation, navigationState.isNavigating, navigationService, selectedBuilding]);

  const handleShortcutPress = (type) => {
    if (type === 'entrada') {
      const entradaCoords = nodeCoords['EP-003'] || ENTRADA_PRINCIPAL_COORDS;
      flyToCoordinate(entradaCoords, ZOOM_CLOSE, 500);
      Alert.alert('Atajo', 'Ubicación centrada en la Entrada Principal del Campus 🚪');
    } else if (type === 'biblioteca') {
      const biblioBuilding = buildings.find(b => 
        b.name.toLowerCase().includes('biblioteca') || 
        b.id === 'E-12' || 
        b.id === 'E-13'
      );
      if (biblioBuilding) {
        calculateAndSetRoute(biblioBuilding);
        Alert.alert('Atajo 📚', `Ruta trazada hacia la Biblioteca (${biblioBuilding.name})`);
      } else {
        Alert.alert('Atajo', 'No se localizó el edificio de biblioteca.');
      }
    } else if (type === 'baños') {
      const buildingsWithBathrooms = buildings.filter(b => b.bathrooms && (b.bathrooms.floor_1 || b.bathrooms.floor_2));
      if (buildingsWithBathrooms.length > 0) {
        setFilteredBuildings(buildingsWithBathrooms);
        // Calcular ruta hacia el más cercano
        calculateAndSetRoute(buildingsWithBathrooms[0]);
        Alert.alert('Atajo 🚻', `Se encontraron ${buildingsWithBathrooms.length} edificios con baños. Ruta trazada hacia ${buildingsWithBathrooms[0].name}.`);
      } else {
        Alert.alert('Atajo', 'No se encontraron edificios con baños registrados.');
      }
    } else if (type === 'comida') {
      const comidaBuilding = buildings.find(b => b.name.toLowerCase().includes('cafetería') || b.id === 'E-18');
      if (comidaBuilding) {
        calculateAndSetRoute(comidaBuilding);
        Alert.alert('Atajo 🍔', 'Ruta trazada hacia la Cafetería del Campus (Edificio Q)');
      }
    }
  };

  const toggleAccessibilityShortcut = () => {
    const nextVal = !isAccessibilityActive;
    setIsAccessibilityActive(nextVal);
    Alert.alert(
      'Modo Accesibilidad',
      nextVal 
        ? '♿ Ruta Inclusiva activada. El mapa priorizará accesos con rampas y pasos nivelados.' 
        : 'Ruta estándar activada.'
    );
    if (selectedBuilding) {
      calculateAndSetRoute(selectedBuilding);
    }
  };

  const handleRouteToEvent = (locationName) => {
    if (!locationName) return;

    let building = buildings.find(b => 
      b.id.toLowerCase() === locationName.toLowerCase() ||
      b.name.toLowerCase().includes(locationName.toLowerCase()) ||
      locationName.toLowerCase().includes(b.name.toLowerCase())
    );

    if (!building) {
      const mapping = {
        'Laboratorio de Ciencias': 'E-21',
        'Centro Deportivo': 'E-18',
        'Auditorio': 'E-27',
        'Edificio T': 'E-21',
        'Edificio Q': 'E-18',
        'Edificio Z': 'E-27',
      };
      const targetBuildingId = mapping[locationName];
      if (targetBuildingId) {
        building = buildings.find(b => b.id === targetBuildingId);
      }
    }

    if (building) {
      calculateAndSetRoute(building);
    } else {
      Alert.alert('Eventos', `📍 El evento es en: ${locationName} (No localizado en mapa)`);
    }
  };

  const centerOnUser = () => {
    const targetCoords = userLocation || nodeCoords['EP-003'];
    if (targetCoords && mapRef.current) {
      flyToCoordinate(targetCoords, ZOOM_BUILDING, 500);
    } else {
      Alert.alert('Ubicación', 'Obteniendo tu ubicación actual...');
    }
  };

  // Pines de edificios (filtrados por la búsqueda) para SigmaMap
  const buildingMarkers = useMemo(
    () => filteredBuildings.map(b => ({ id: b.id, name: b.name, coordinates: b.coordinates })),
    [filteredBuildings]
  );

  // Colores del tema activo para las capas del mapa
  const mapColors = useMemo(() => ({
    primary: theme.primary,
    secondary: theme.secondary,
    path: theme.gray?.[300],
  }), [theme]);

  const handleMapBuildingPress = useCallback((feature) => {
    const buildingId = feature?.properties?.id || feature?.id;
    const target = buildings.find(b => b.id === buildingId);
    if (target) calculateAndSetRoute(target);
  }, [buildings, calculateAndSetRoute]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.primary, fontFamily: 'Roboto-Medium' }}>Cargando mapa...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={{ backgroundColor: theme.primary, zIndex: 100 }}>
        <MapHeader />
      </View>
      <View style={styles.mapWrapper}>
        <SigmaMap
          ref={mapRef}
          style={styles.map}
          buildings={edificios}
          paths={caminos}
          entrances={entradas}
          campusBoundary={perimetroCampus}
          buildingMarkers={buildingMarkers}
          selectedBuilding={selectedBuilding?.id}
          userLocation={userLocation}
          isSimulatedUser={isSimulatedUser}
          routeResult={routeResult}
          colors={mapColors}
          onBuildingPress={handleMapBuildingPress}
          onMapPress={closeInfoPanel}
        />

        {/* Botón flotante para centrar en la ubicación del usuario */}
        <TouchableOpacity
          style={[styles.locateButton, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
          onPress={centerOnUser}
          activeOpacity={0.8}
        >
          <LocateFixed size={22} color={theme.primary} />
        </TouchableOpacity>

        {/* Barra de búsqueda flotante sobre el mapa */}
        <View style={styles.searchBarWrapper}>
          <SearchBar onSearch={handleSearch} />
        </View>

        {/* Panel de Control Inferior (Dashboard) Plegable y Glassmorphism */}
        {showEventsPanel ? (
          <View style={[styles.bottomPanel, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder, borderTopWidth: 1.2 }]}>
            {/* Tirador estético */}
            <View style={[styles.dragHandle, { backgroundColor: theme.gray[300] }]} />

            {/* Botón de cerrar panel */}
            <TouchableOpacity 
              onPress={() => setShowEventsPanel(false)} 
              style={styles.closePanelButton}
            >
              <X size={18} color={theme.gray[600]} />
            </TouchableOpacity>

            {/* Fila Horizontal de Atajos Rápidos */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.shortcutsWrapper}
              contentContainerStyle={styles.shortcutsContent}
            >
              <TouchableOpacity style={styles.shortcutPill} onPress={() => handleShortcutPress('biblioteca')}>
                <Text style={styles.shortcutEmoji}>📚</Text>
                <Text style={[styles.shortcutText, { color: theme.gray[800] }]}>Biblioteca</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shortcutPill} onPress={() => handleShortcutPress('comida')}>
                <Text style={styles.shortcutEmoji}>🍔</Text>
                <Text style={[styles.shortcutText, { color: theme.gray[800] }]}>Cafetería</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shortcutPill} onPress={() => handleShortcutPress('baños')}>
                <Text style={styles.shortcutEmoji}>🚻</Text>
                <Text style={[styles.shortcutText, { color: theme.gray[800] }]}>Baños</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shortcutPill} onPress={toggleAccessibilityShortcut}>
                <Text style={styles.shortcutEmoji}>♿</Text>
                <Text style={[styles.shortcutText, { color: theme.gray[800] }]}>Ruta Inclusiva</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shortcutPill} onPress={() => handleShortcutPress('entrada')}>
                <Text style={styles.shortcutEmoji}>🚪</Text>
                <Text style={[styles.shortcutText, { color: theme.gray[800] }]}>Entrada Principal</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Carrusel de eventos vinculado a rutas directas */}
            <EventsCarousel events={events} onRouteToEvent={handleRouteToEvent} />
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.floatingEventsFab, { backgroundColor: theme.primary }]}
            onPress={() => setShowEventsPanel(true)}
          >
            <Calendar size={18} color="#ffffff" />
            <Text style={styles.floatingEventsFabText}>Eventos y Atajos 📅</Text>
          </TouchableOpacity>
        )}
      </View>

      {selectedBuilding && (
        <Animated.View style={[styles.infoPanel, animatedPanelStyle, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder, borderTopWidth: 1.5 }]}>
          <BuildingInfoPanel
            building={selectedBuilding}
            onClose={closeInfoPanel}
            onRoutePress={() => calculateAndSetRoute(selectedBuilding)}
            routeResult={routeResult}
            navigationState={navigationState}
            onStartNavigation={handleStartNavigation}
            onStopNavigation={handleStopNavigation}
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  mapWrapper: {
    flex: 1,
    height: windowHeight - 60,
    width: '100%',
    position: 'relative',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  searchBarWrapper: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 50,
  },
  locateButton: {
    position: 'absolute',
    right: 16,
    top: 76,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    borderWidth: 1,
    zIndex: 60,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 16,
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    zIndex: 90,
  },
  dragHandle: {
    width: 38,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 6,
  },
  shortcutsWrapper: {
    marginVertical: 4,
  },
  shortcutsContent: {
    paddingHorizontal: DIMENSIONS.spacing.md,
    gap: 8,
    paddingBottom: 6,
  },
  shortcutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1.5,
  },
  shortcutEmoji: {
    fontSize: 13,
    marginRight: 5,
  },
  shortcutText: {
    fontSize: 11,
    fontFamily: 'Roboto-Bold',
  },
  infoPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: windowHeight * 0.5,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: DIMENSIONS.borderRadius.xl,
    borderTopRightRadius: DIMENSIONS.borderRadius.xl,
    elevation: 10,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    zIndex: 150,
    paddingBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingEventsFab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 80,
  },
  floatingEventsFabText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Roboto-Bold',
    marginLeft: 6,
  },
  closePanelButton: {
    position: 'absolute',
    top: 8,
    right: 16,
    padding: 4,
    zIndex: 95,
  },
});