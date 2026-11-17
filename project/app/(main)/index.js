import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, Text, Dimensions, Alert, ScrollView, Animated, Image, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import edificios from '../../assets/geo/Edificios.json';
import caminos from '../../assets/geo/caminos.json';
import entradas from '../../assets/geo/Entradas.json';
import perimetroCampus from '../../assets/geo/PerimetroCampus.json';
import { buildGraph, findRoute, findNearestNode } from '../../src/core/utils/graphUtils';

import MapHeader from '../../src/presentation/components/MapHeader';
import SearchBar from '../../src/presentation/components/SearchBar';
import BuildingInfoPanel from '../../src/presentation/components/BuildingInfoPanel';
import EventsCarousel from '../../src/presentation/components/EventsCarousel';
import { serviceContainer } from '../../src/infrastructure/di/ServiceContainer';
import { COLORS } from '../../src/core/constants/colors';
import { DIMENSIONS } from '../../src/core/constants/dimensions';
import { useTheme } from '../../src/core/context/ThemeContext';
import { School, X, Calendar, LocateFixed } from 'lucide-react-native';

let SigmaMapWeb = null;
if (Platform.OS === 'web') {
  try {
    SigmaMapWeb = require('../../src/presentation/components/map/SigmaMapWeb').SigmaMapWeb;
  } catch (e) {
    console.warn('[MapScreen] No se pudo cargar el modulo SigmaMapWeb:', e.message);
  }
}

const { width, height } = Dimensions.get('window');
const LATITUDE_DELTA = 0.005;
const LONGITUDE_DELTA = LATITUDE_DELTA * (width / height);
const windowHeight = Dimensions.get('window').height;

const INITIAL_CAMPUS_REGION = {
  latitude: 19.4074,
  longitude: -98.1198,
  latitudeDelta: LATITUDE_DELTA,
  longitudeDelta: LONGITUDE_DELTA,
};

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
  const [geojsonLines, setGeojsonLines] = useState([]);
  const [routePath, setRoutePath] = useState([]);
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

      // Procesar líneas de caminos para visualización en el mapa
      const lines = caminos.features
        .filter(f => f.geometry.type === 'LineString' || f.geometry.type === 'Point')
        .map(f => {
          if (f.geometry.type === 'LineString') {
            return {
              id: f.properties?.id || Math.random().toString(),
              coordinates: f.geometry.coordinates.map(coord => ({
                latitude: coord[1],
                longitude: coord[0],
              })),
            };
          }
          return null;
        })
        .filter(line => line !== null);

      setGeojsonLines(lines);
      console.log(`✅ ${lines.length} líneas de caminos cargadas`);
    } catch (err) {
      console.error('❌ Error procesando GeoJSON:', err);
      Alert.alert('Error', 'No se pudieron cargar los datos del mapa');
    }
  };

  const loadInitialData = async () => {
    try {
      const eventsData = await eventUseCases.getActiveEvents();
      setEvents(eventsData);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los datos');
    }
    finally {
      setIsLoading(false);
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

  /**
   * Calcula la ruta dinámicamente utilizando RoutingService (OSRM, Dijkstra o Híbrida)
   */
  const calculateAndSetRoute = useCallback(async (targetBuilding, customStartCoords = null) => {
    if (!targetBuilding) return;
    setSelectedBuilding(targetBuilding);

    const startCoords = customStartCoords || userLocation || {
      latitude: 19.40719130839912,
      longitude: -98.12107448617152,
    };

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

      if (result && Array.isArray(result.coordinates)) {
        setRoutePath(result.coordinates);
      }

      if (mapRef.current) {
        if (typeof mapRef.current.animateToRegion === 'function') {
          mapRef.current.animateToRegion({
            latitude: targetBuilding.coordinates.latitude,
            longitude: targetBuilding.coordinates.longitude,
            latitudeDelta: 0.003,
            longitudeDelta: 0.003,
          }, 500);
        } else if (typeof mapRef.current.flyTo === 'function') {
          mapRef.current.flyTo({
            center: [targetBuilding.coordinates.longitude, targetBuilding.coordinates.latitude],
            zoom: 17,
            duration: 500,
          });
        }
      }
    } catch (err) {
      const sanitized = (err.message || '').replace(/key=[a-zA-Z0-9_-]+/g, 'key=REDACTED');
      console.warn('⚠️ Error al calcular la ruta:', sanitized);
      setRouteResult(null);
      setRoutePath([]);
      Alert.alert('Ruta no disponible', `No se pudo calcular una ruta hacia ${targetBuilding.name}.`);
    } finally {
      setIsRouting(false);
    }
  }, [userLocation, routingService, campusAccessService]);

  const handleMarkerPress = (building) => {
    calculateAndSetRoute(building);
  };

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
    setRoutePath([]);
    if (navigationService) {
      const navState = navigationService.clearNavigation();
      setNavigationState(navState);
    }
  };

  const handleStartNavigation = useCallback(() => {
    if (!navigationService || !routeResult) return;
    const startPos = userLocation || { latitude: 19.407191, longitude: -98.121074 };
    const newState = navigationService.startNavigation(routeResult, startPos);
    setNavigationState(newState);

    if (mapRef.current) {
      if (typeof mapRef.current.flyTo === 'function') {
        mapRef.current.flyTo({
          center: [startPos.longitude, startPos.latitude],
          zoom: 18,
          duration: 800,
        });
      } else if (typeof mapRef.current.animateToRegion === 'function') {
        mapRef.current.animateToRegion({
          latitude: startPos.latitude,
          longitude: startPos.longitude,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        }, 800);
      }
    }
  }, [navigationService, routeResult, userLocation]);

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
      const entradaCoords = nodeCoords['EP-003'] || {
        latitude: 19.40719130839912,
        longitude: -98.12107448617152,
      };
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: entradaCoords.latitude,
          longitude: entradaCoords.longitude,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        }, 500);
      }
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
      mapRef.current.animateToRegion({
        latitude: targetCoords.latitude,
        longitude: targetCoords.longitude,
        latitudeDelta: 0.003,
        longitudeDelta: 0.003,
      }, 500);
    } else {
      Alert.alert('Ubicación', 'Obteniendo tu ubicación actual...');
    }
  };

  // Memoizar coordenadas del perímetro para evitar recomputaciones
  const campusPerimeterCoords = useMemo(() => {
    return perimetroCampus.features[0]?.geometry?.coordinates?.map(coord => ({
      latitude: coord[1],
      longitude: coord[0],
    })) || [];
  }, []);

  // Memoizar polígonos de edificios
  const buildingPolygons = useMemo(() => {
    return buildings.map(building => {
      const feature = edificios.features?.find(f => f.properties?.id === building.id);
      if (!feature || feature.geometry?.type !== 'Polygon') return null;
      return {
        id: building.id,
        coordinates: feature.geometry.coordinates[0].map(coord => ({
          latitude: coord[1],
          longitude: coord[0],
        })),
      };
    }).filter(Boolean);
  }, [buildings]);

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
        {Platform.OS === 'web' && SigmaMapWeb ? (
          <SigmaMapWeb
            ref={mapRef}
            buildings={edificios}
            paths={caminos}
            entrances={entradas}
            campusBoundary={perimetroCampus}
            selectedBuilding={selectedBuilding?.id}
            onBuildingPress={(feat) => {
              const bId = feat?.properties?.id || feat?.id;
              const bObj = buildings.find(b => b.id === bId);
              if (bObj) calculateAndSetRoute(bObj);
            }}
            onMapPress={() => {
              closeInfoPanel();
            }}
            routeResult={routeResult}
            style={styles.map}
          />
        ) : (
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={INITIAL_CAMPUS_REGION}
            showsUserLocation={!isSimulatedUser}
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={false}
          rotateEnabled={true}
          pitchEnabled={true}
          scrollEnabled={true}
          zoomEnabled={true}
          cameraBoundary={{
            latitudeLimits: { min: 19.4045, max: 19.4125 },
            longitudeLimits: { min: -98.1255, max: -98.1160 },
          }}
          minZoomLevel={15}
          maxZoomLevel={20}
        >
          {/* Línea del Perímetro del Campus */}
          {campusPerimeterCoords.length > 0 && (
            <Polyline
              coordinates={campusPerimeterCoords}
              strokeColor={theme.secondary}
              strokeWidth={2.8}
              lineDashPattern={[6, 4]}
            />
          )}

          {/* 1. Dibujar formas poligonales reales de los edificios */}
          {buildingPolygons.map((poly) => {
            const isSelected = selectedBuilding?.id === poly.id;
            return (
              <Polygon
                key={`poly-${poly.id}`}
                coordinates={poly.coordinates}
                fillColor={isSelected ? `${theme.secondary}33` : `${theme.primary}15`}
                strokeColor={isSelected ? theme.secondary : `${theme.primary}55`}
                strokeWidth={isSelected ? 2.5 : 1.2}
              />
            );
          })}

          {/* 2. Dibujar caminos generales de la red */}
          {geojsonLines.map((line) => (
            <Polyline
              key={line.id}
              coordinates={line.coordinates}
              strokeColor={theme.gray[300]}
              strokeWidth={3.5}
            />
          ))}

          {/* 3. Dibujar pines interactivos con tracksViewChanges optimizado */}
          {filteredBuildings.map((building) => {
            const isSelected = selectedBuilding?.id === building.id;
            return (
              <Marker
                key={building.id}
                coordinate={building.coordinates}
                onPress={() => handleMarkerPress(building)}
                tracksViewChanges={isSelected}
              >
                <View style={[
                  styles.markerContainer,
                  isSelected && styles.markerContainerSelected
                ]}>
                  <View style={[
                    styles.markerBadge,
                    { 
                      backgroundColor: isSelected ? theme.secondary : theme.primary,
                      borderColor: '#ffffff',
                      width: isSelected ? 34 : 26,
                      height: isSelected ? 34 : 26,
                      borderRadius: isSelected ? 17 : 13,
                    }
                  ]}>
                    <School size={isSelected ? 15 : 11} color="#ffffff" />
                  </View>
                  {isSelected && (
                    <View style={[styles.markerTitleContainer, { backgroundColor: theme.primary }]}>
                      <Text style={styles.markerTitleText}>{building.name}</Text>
                    </View>
                  )}
                </View>
              </Marker>
            );
          })}

          {/* 4. Dibujar ruta activa con resplandor de neón */}
          {routePath.length > 1 && (
            <>
              {/* Aura base de resplandor */}
              <Polyline
                coordinates={routePath}
                strokeColor={`${theme.secondary}33`}
                strokeWidth={11}
              />
              {/* Línea principal discontinua */}
              <Polyline
                coordinates={routePath}
                strokeColor={theme.secondary}
                strokeWidth={5.5}
                lineDashPattern={[10, 5]}
              />
            </>
          )}

          {/* 5. Dibujar indicador de Usuario Simulado (Modo Demostración / Fuera de Campus) */}
          {isSimulatedUser && userLocation && (
            <Marker
              key="simulated-user"
              coordinate={userLocation}
              title="Tú (Ubicación Simulada)"
              description="Navegación demostrativa"
              tracksViewChanges={false}
            >
              <View style={styles.simulatedUserContainer}>
                <View style={[styles.simulatedUserPulse, { backgroundColor: `${theme.secondary}44` }]} />
                <View style={[styles.simulatedUserDot, { backgroundColor: theme.secondary }]} />
              </View>
            </Marker>
          )}
        </MapView>
        )}

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
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 80,
    overflow: 'visible',
  },
  markerContainerSelected: {
    zIndex: 999,
  },
  markerBadge: {
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    borderWidth: 2.2,
  },
  markerTitleContainer: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: DIMENSIONS.borderRadius.md,
    marginTop: 4,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.22,
    shadowRadius: 1.8,
  },
  markerTitleText: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'Roboto-Bold',
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
  simulatedUserContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  simulatedUserDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#ffffff',
    position: 'absolute',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  simulatedUserPulse: {
    width: 28,
    height: 28,
    borderRadius: 14,
    position: 'absolute',
    opacity: 0.7,
  },
});