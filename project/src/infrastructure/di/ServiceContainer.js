// infrastructure/di/ServiceContainer.js

import { HttpAuthRepository } from '../repositories/HttpAuthRepository.js'; // ✅ Cambiado
import { HttpEventRepository } from '../repositories/HttpEventRepository.js';
import { HttpBuildingRepository } from '../repositories/HttpBuildingRepository.js';
import { HttpGeoRepository } from '../repositories/HttpGeoRepository.js';
import { OsrmClient } from '../http/OsrmClient.js';
import api from '../../core/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthUseCases } from '../../core/usecases/AuthUseCases.js';
import { BuildingUseCases } from '../../core/usecases/BuildingUseCases.js';
import { EventUseCases } from '../../core/usecases/EventUseCases.js';
import { RoutingService } from '../../core/services/RoutingService.js';
import { DijkstraRoutingService } from '../../core/services/DijkstraRoutingService.js';
import { CampusAccessService } from '../../core/services/CampusAccessService.js';

import { NavigationService } from '../../core/services/NavigationService.js';

// GeoJSON empaquetados: se usan al arrancar y como respaldo si el backend no responde.
import { BUNDLED_GEO } from '../../core/geo/bundledGeo';

class ServiceContainer {
  constructor() {
    this._services = new Map();
    this._setupServices();
  }

  _setupServices() {
    // Repositories
    this._services.set('authRepository', new HttpAuthRepository()); // ✅ Sustituido
    this._services.set('buildingRepository', new HttpBuildingRepository());
    this._services.set('eventRepository', new HttpEventRepository());

    this._services.set('geoRepository', new HttpGeoRepository({
      http: api,
      storage: AsyncStorage,
      bundled: BUNDLED_GEO,
    }));

    // HTTP Clients & Domain Services
    this._services.set('osrmClient', new OsrmClient());
    this._services.set('navigationService', new NavigationService());
    this.configureGeoData(BUNDLED_GEO);

    // Services & Use Cases
    this._services.set('authUseCases', new AuthUseCases(this.get('authRepository')));
    this._services.set('buildingUseCases', new BuildingUseCases(this.get('buildingRepository')));
    this._services.set('eventUseCases', new EventUseCases(this.get('eventRepository')));
  }

  /**
   * (Re)construye los servicios que dependen de las capas del campus.
   * Se llama al arrancar con las capas empaquetadas y de nuevo cuando llegan capas del backend.
   * NavigationService no se toca: conserva una navegación en curso.
   * @param {{ buildings: object, paths: object, entrances: object, perimeter: object }} layers
   */
  configureGeoData(layers) {
    const dijkstraRoutingService = new DijkstraRoutingService({
      geoJsonFeatures: [...layers.entrances.features, ...layers.paths.features],
    });
    const campusAccessService = new CampusAccessService({
      geoJsonEntradas: layers.entrances,
      geoJsonCaminos: layers.paths,
      geoJsonEdificios: layers.buildings,
      geoJsonPerimetro: layers.perimeter,
    });
    this._services.set('dijkstraRoutingService', dijkstraRoutingService);
    this._services.set('campusAccessService', campusAccessService);
    this._services.set('routingService', new RoutingService({
      osrmClient: this.get('osrmClient'),
      dijkstraRoutingService,
      campusAccessService,
    }));
  }

  get(serviceName) {
    const service = this._services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }
    return service;
  }

  set(serviceName, service) {
    this._services.set(serviceName, service);
  }
}

export const serviceContainer = new ServiceContainer();
