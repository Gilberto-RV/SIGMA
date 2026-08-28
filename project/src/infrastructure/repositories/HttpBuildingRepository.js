import { BuildingRepository } from '../../core/repositories/BuildingRepository';
import { Building } from '../../core/entities/Building';
import axios from 'axios';
import api from '../../core/config/api';

import AsyncStorage from '@react-native-async-storage/async-storage';

export class HttpBuildingRepository extends BuildingRepository {
  constructor() {
    super();
    this.apiUrl = 'buildings';
  }

  async getAllBuildings() {
    try {
      const response = await api.get('/buildings');
      if (response?.data && Array.isArray(response.data)) {
        // Guardar en caché local para soporte offline
        AsyncStorage.setItem('cached_buildings', JSON.stringify(response.data)).catch(() => {});
        return response.data.map(item => new Building(this.mapApiDataToEntity(item)));
      }
    } catch (error) {
      console.warn('⚠️ Red no disponible para edificios, cargando desde caché offline...');
      try {
        const cached = await AsyncStorage.getItem('cached_buildings');
        if (cached) {
          const parsed = JSON.parse(cached);
          return parsed.map(item => new Building(this.mapApiDataToEntity(item)));
        }
      } catch (cacheError) {
        console.error('Error al leer caché de edificios:', cacheError);
      }
    }
    return [];
  }

  async getBuildingById(id) {
    try {
      const response = await api.get('/buildings/' + id);
      return new Building(this.mapApiDataToEntity(response.data));
    } catch (error) {
      console.error(`Error al obtener edificio con id ${id}:`, error);
      throw new Error('Edificio no encontrado');
    }
  }

  async searchBuildings(query, filters = {}) {
    try {
      const allBuildings = await this.getAllBuildings();
      return allBuildings.filter(building =>
        building.name.toLowerCase().includes(query.toLowerCase()) ||
        building.description.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      console.error('Error al buscar edificios:', error);
      return [];
    }
  }

  async loadBuildingsFromGeoJSON() {
    return await this.getAllBuildings();
  }

  mapApiDataToEntity(data) {
    return {
      id: data.geo_id|| data._id,
      name: data.name,
      description: data.description,
      coordinates: data.entrances?.length
        ? { latitude: data.entrances[0][1], longitude: data.entrances[0][0] }
        : { latitude: 0, longitude: 0 },
      media: data.media,
      accessibility: data.accessibility,
      availability: data.availability,
      bathrooms: data.bathrooms,
      
      // Relacionales poblados:
      careers: data.id_careers || [],         // << Aquí estaba mal antes
      student_frequency: data.student_frequency,
      entrances: data.entrances,
      floors: data.floors,
      last_updated: data.last_updated,
      services: data.id_services || [],       // << Aquí también
      subject: data.subjects || [],
    };
  }
}
