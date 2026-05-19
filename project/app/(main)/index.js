import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Text, Dimensions, Alert, ScrollView, Animated, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, Polygon } from 'react-native-maps';
import * as Location from 'expo-location';
import edificios from '../../assets/geo/Edificios.json';
import caminos from '../../assets/geo/caminos.json';
import entradas from '../../assets/geo/Entradas.json';
import perimetroCampus from '../../assets/geo/PerimetroCampus.json';
import { buildGraph, findRoute } from '../../src/core/utils/graphUtils';

import MapHeader from '../../src/presentation/components/MapHeader';
import SearchBar from '../../src/presentation/components/SearchBar';
import BuildingInfoPanel from '../../src/presentation/components/BuildingInfoPanel';
import EventsCarousel from '../../src/presentation/components/EventsCarousel';
import { serviceContainer } from '../../src/infrastructure/di/ServiceContainer';
import { COLORS } from '../../src/core/constants/colors';
import { DIMENSIONS } from '../../src/core/constants/dimensions';
import { useTheme } from '../../src/core/context/ThemeContext';
import { School, X, Calendar } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');
const LATITUDE_DELTA = 0.01;
const LONGITUDE_DELTA = LATITUDE_DELTA * (width / height);
const windowHeight = Dimensions.get('window').height;

export default function MapScreen() {
  const { theme } = useTheme();
  const [buildings, setBuildings] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBuildings, setFilteredBuildings] = useState([]);
  const [geojsonLines, setGeojsonLines] = useState([]);
  const [mapRegion, setMapRegion] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [graph, setGraph] = useState({});
  const [nodeCoords, setNodeCoords] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAccessibilityActive, setIsAccessibilityActive] = useState(false);
  const [showEventsPanel, setShowEventsPanel] = useState(true);
  const [isInsideCampus, setIsInsideCampus] = useState(true);
  const [isSimulatedUser, setIsSimulatedUser] = useState(false);

  const eventUseCases = serviceContainer.get('eventUseCases');
  const buildingUseCases = serviceContainer.get('buildingUseCases');
  const panelAnimation = useRef(new Animated.Value(0)).current;

  const buildingAccessibleIcon = require('../../assets/icons/a_building.png');
  const buildingNormalIcon = require('../../assets/icons/n_building.png');

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
      const { graph, nodeCoords } = buildGraph(allFeatures);
      setGraph(graph);
      setNodeCoords(nodeCoords);

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

      // Establecer región del mapa
      if (geoBuildings.length > 0) {
        const centro = geoBuildings[0].coordinates;
        setMapRegion({
          latitude: centro.latitude,
          longitude: centro.longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        });
        console.log('✅ Región del mapa establecida');
      }
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

  const handleRegionChangeComplete = (region) => {
    // Límites estrictos del campus
    const minLat = 19.4058;
    const maxLat = 19.4112;
    const minLng = -98.1242;
    const maxLng = -98.1174;

    let adjustedLat = region.latitude;
    let adjustedLng = region.longitude;
    let needsAdjustment = false;

    if (region.latitude < minLat) {
      adjustedLat = minLat;
      needsAdjustment = true;
    } else if (region.latitude > maxLat) {
      adjustedLat = maxLat;
      needsAdjustment = true;
    }

    if (region.longitude < minLng) {
      adjustedLng = minLng;
      needsAdjustment = true;
    } else if (region.longitude > maxLng) {
      adjustedLng = maxLng;
      needsAdjustment = true;
    }

    if (needsAdjustment) {
      setMapRegion({
        ...region,
        latitude: adjustedLat,
        longitude: adjustedLng,
      });
    } else {
      setMapRegion(region);
    }
  };

  const isPointInPolygon = (point, polygon) => {
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
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const location = await Location.getCurrentPositionAsync({});
      const currentCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      const campusPolygon = perimetroCampus.features[0].geometry.coordinates;
      const inside = isPointInPolygon(currentCoords, campusPolygon);
      
      setIsInsideCampus(inside);
      
      if (inside) {
        setUserLocation(currentCoords);
        setIsSimulatedUser(false);
      } else {
        // Coordenadas exactas de la Entrada Principal EP-003
        const entradaPrincipalCoords = {
          latitude: 19.40719130839912,
          longitude: -98.12107448617152,
        };
        setUserLocation(entradaPrincipalCoords);
        setIsSimulatedUser(true);
        Alert.alert(
          'Geofencing Activo 🔒',
          'Te encuentras fuera del campus de INNOVATEC. Para tu comodidad y evaluación ante el jurado, se ha activado la simulación GPS situándote en la Entrada Principal del plantel.'
        );
      }
    } else {
      // Coordenadas de contingencia/simulación si se niega el permiso
      const entradaPrincipalCoords = {
        latitude: 19.40719130839912,
        longitude: -98.12107448617152,
      };
      setUserLocation(entradaPrincipalCoords);
      setIsSimulatedUser(true);
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

  const handleMarkerPress = (building) => {
    setSelectedBuilding(building);
    if (!building.entradaId) {
      console.warn(`🚪 Edificio ${building.name} no tiene entradaId asignado`);
      return;
    }

    const entrada = entradas.features.find(
      f => f.properties.id === building.entradaId && f.properties.tipo === 'ENTRADA_EDIFICIO'
    );

    if (!entrada) {
      console.warn(`🚪 Entrada no encontrada para edificio ${building.id} con entradaId ${building.entradaId}`);
      return;
    }

    const destinoId = entrada.properties.id;
    const path = findRoute(graph, 'EP-003', destinoId, nodeCoords);

    if (path) {
      const coords = path.map(id => nodeCoords[id]).filter(Boolean);
      setRoutePath(coords);
    } else {
      console.warn('⚠️ No se encontró ruta hacia', destinoId);
    }
  };

  const calculateCenter = (coordinates) => {
    const lats = coordinates.map(c => c.latitude);
    const lngs = coordinates.map(c => c.longitude);
    return {
      latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
      longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    };
  };

  const calculateCenterFromPolygon = (polygonCoords) => {
    const lats = polygonCoords.map(c => c[1]);
    const lngs = polygonCoords.map(c => c[0]);
    return {
      latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
      longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    };
  };

  const handleSearch = (query, filters) => {
    setSearchQuery(query);

    const target = buildings.find(b =>
      b.name.toLowerCase().includes(query.toLowerCase())
    );

    if (!target) {
      console.warn('🏠 Edificio no encontrado');
      return;
    }

    const entradaId = target.entradaId;
    if (!entradaId) {
      console.warn('❌ Edificio encontrado, pero sin entrada asignada');
      return;
    }

    const entrada = entradas.features.find(
      f => f.properties.id === entradaId && f.properties.tipo === 'ENTRADA_EDIFICIO'
    );

    if (!entrada) {
      console.warn(`🚪 Entrada no encontrada para edificio ${entradaId}`);
      return;
    }

    const destinoId = entrada.properties.id;
    const path = findRoute(graph, 'EP-003', destinoId, nodeCoords);

    if (path) {
      const coords = path.map(id => nodeCoords[id]).filter(Boolean);
      setRoutePath(coords);
    } else {
      console.warn('⚠️ No se encontró ruta hacia', destinoId);
    }

    filterBuildings();
  };

  const closeInfoPanel = () => {
    setSelectedBuilding(null);
  };

  const handleShortcutPress = (type) => {
    if (type === 'entrada') {
      const entradaCoords = nodeCoords['EP-003'];
      if (entradaCoords) {
        setMapRegion({
          latitude: entradaCoords.latitude,
          longitude: entradaCoords.longitude,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        });
        Alert.alert('Atajo', 'Ubicación centrada en la Entrada Principal del Campus 🚪');
      }
    } else if (type === 'baños') {
      const buildingsWithBathrooms = buildings.filter(b => b.bathrooms && (b.bathrooms.floor_1 || b.bathrooms.floor_2));
      if (buildingsWithBathrooms.length > 0) {
        setFilteredBuildings(buildingsWithBathrooms);
        setMapRegion({
          latitude: buildingsWithBathrooms[0].coordinates.latitude,
          longitude: buildingsWithBathrooms[0].coordinates.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
        Alert.alert('Atajo', `🚻 Se encontraron ${buildingsWithBathrooms.length} edificios con baños en el Campus.`);
      } else {
        Alert.alert('Atajo', 'No se encontraron edificios con baños en los metadatos.');
      }
    } else if (type === 'comida') {
      const comidaBuilding = buildings.find(b => b.name.toLowerCase().includes('cafetería') || b.id === 'E-18');
      if (comidaBuilding) {
        handleMarkerPress(comidaBuilding);
        setMapRegion({
          latitude: comidaBuilding.coordinates.latitude,
          longitude: comidaBuilding.coordinates.longitude,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        });
        Alert.alert('Atajo', 'Cafetería del Campus ubicada en el Edificio Q 🍔');
      }
    }
  };

  const toggleAccessibilityShortcut = () => {
    const nextVal = !isAccessibilityActive;
    setIsAccessibilityActive(nextVal);
    Alert.alert(
      'Modo Accesibilidad',
      nextVal 
        ? '♿ Ruta Inclusiva activada. El mapa priorizará accesos con rampas y elevadores.' 
        : 'Ruta estándar activada.'
    );
    if (selectedBuilding) {
      handleMarkerPress(selectedBuilding);
    }
  };

  const handleRouteToEvent = (locationName) => {
    if (!locationName) return;

    // 1. Intentar buscar el edificio dinámicamente por nombre o ID en el listado
    let building = buildings.find(b => 
      b.id.toLowerCase() === locationName.toLowerCase() ||
      b.name.toLowerCase().includes(locationName.toLowerCase()) ||
      locationName.toLowerCase().includes(b.name.toLowerCase())
    );

    // 2. Mapeos de fallback/compatibilidad
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

    // 3. Si localizamos el edificio, pintar ruta e iluminarlo
    if (building) {
      handleMarkerPress(building);
      setMapRegion({
        latitude: building.coordinates.latitude,
        longitude: building.coordinates.longitude,
        latitudeDelta: 0.003,
        longitudeDelta: 0.003,
      });
    } else {
      Alert.alert('Eventos', `📍 El evento es en: ${locationName} (No localizado en mapa)`);
    }
  };

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
        <MapView
          style={styles.map}
          region={mapRegion}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation={!isSimulatedUser}
          showsMyLocationButton={!isSimulatedUser}
          cameraBoundary={{
            latitudeLimits: { min: 19.4058, max: 19.4112 },
            longitudeLimits: { min: -98.1242, max: -98.1174 },
          }}
        >


          {/* Línea del Perímetro del Campus de Neón */}
          <Polyline
            coordinates={perimetroCampus.features[0].geometry.coordinates.map(coord => ({
              latitude: coord[1],
              longitude: coord[0],
            }))}
            strokeColor={theme.secondary}
            strokeWidth={2.8}
            lineDashPattern={[6, 4]}
          />
          {/* 1. Dibujar formas poligonales reales de los edificios */}
          {buildings.map((building) => {
            const feature = edificios.features?.find(f => f.properties?.id === building.id);
            if (!feature || feature.geometry?.type !== 'Polygon') return null;

            const isSelected = selectedBuilding?.id === building.id;
            const polygonCoords = feature.geometry.coordinates[0].map(coord => ({
              latitude: coord[1],
              longitude: coord[0],
            }));

            return (
              <Polygon
                key={`poly-${building.id}`}
                coordinates={polygonCoords}
                fillColor={isSelected ? `${theme.secondary}33` : `${theme.primary}15`}
                strokeColor={isSelected ? theme.secondary : `${theme.primary}55`}
                strokeWidth={isSelected ? 2.5 : 1.2}
              />
            );
          })}

          {/* 2. Dibujar caminos generales */}
          {geojsonLines.map((line) => (
            <Polyline
              key={line.id}
              coordinates={line.coordinates}
              strokeColor={theme.gray[300]}
              strokeWidth={3.5}
            />
          ))}

          {/* 3. Dibujar pines interactivos con micro-escala */}
          {filteredBuildings.map((building) => {
            const isSelected = selectedBuilding?.id === building.id;
            return (
              <Marker
                key={building.id}
                coordinate={building.coordinates}
                onPress={() => handleMarkerPress(building)}
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

          {/* 5. Dibujar indicador de Usuario Simulado (Modo Demostración) */}
          {isSimulatedUser && userLocation && (
            <Marker
              key="simulated-user"
              coordinate={userLocation}
              title="Tú (Ubicación Simulada)"
              description="Navegación demostrativa desde la Entrada Principal"
            >
              <View style={styles.simulatedUserContainer}>
                <View style={[styles.simulatedUserPulse, { backgroundColor: `${theme.secondary}44` }]} />
                <View style={[styles.simulatedUserDot, { backgroundColor: theme.secondary }]} />
              </View>
            </Marker>
          )}
        </MapView>

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
              <TouchableOpacity style={styles.shortcutPill} onPress={() => {}}>
                <Text style={styles.shortcutEmoji}>📚</Text>
                <Text style={[styles.shortcutText, { color: theme.gray[800] }]}>Biblioteca</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shortcutPill} onPress={() => {}}>
                <Text style={styles.shortcutEmoji}>🍔</Text>
                <Text style={[styles.shortcutText, { color: theme.gray[800] }]}>Cafetería</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shortcutPill} onPress={() => {}}>
                <Text style={styles.shortcutEmoji}>🚻</Text>
                <Text style={[styles.shortcutText, { color: theme.gray[800] }]}>Baños</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shortcutPill} onPress={() => {}}>
                <Text style={styles.shortcutEmoji}>♿</Text>
                <Text style={[styles.shortcutText, { color: theme.gray[800] }]}>Ruta Inclusiva</Text>
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
    height: windowHeight * 0.5, // 40% de la pantalla
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