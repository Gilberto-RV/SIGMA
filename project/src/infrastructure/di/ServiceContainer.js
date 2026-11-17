// infrastructure/di/ServiceContainer.js

import { HttpAuthRepository } from '../repositories/HttpAuthRepository.js'; // ✅ Cambiado
import { HttpEventRepository } from '../repositories/HttpEventRepository.js';
import { HttpBuildingRepository } from '../repositories/HttpBuildingRepository.js';
import { OsrmClient } from '../http/OsrmClient.js';

import { AuthUseCases } from '../../core/usecases/AuthUseCases.js';
import { BuildingUseCases } from '../../core/usecases/BuildingUseCases.js';
import { EventUseCases } from '../../core/usecases/EventUseCases.js';
import { RoutingService } from '../../core/services/RoutingService.js';
import { DijkstraRoutingService } from '../../core/services/DijkstraRoutingService.js';
import { CampusAccessService } from '../../core/services/CampusAccessService.js';

import { NavigationService } from '../../core/services/NavigationService.js';

// GeoJSON del campus: Metro los empaqueta como módulos JSON y aquí se inyectan en los servicios.
import entradasGeo from '../../../assets/geo/Entradas.json';
import caminosGeo from '../../../assets/geo/caminos.json';
import edificiosGeo from '../../../assets/geo/Edificios.json';
import perimetroGeo from '../../../assets/geo/PerimetroCampus.json';

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

    // HTTP Clients & Domain Services
    this._services.set('osrmClient', new OsrmClient());
    this._services.set('dijkstraRoutingService', new DijkstraRoutingService({
      geoJsonFeatures: [...entradasGeo.features, ...caminosGeo.features],
    }));
    this._services.set('campusAccessService', new CampusAccessService({
      geoJsonEntradas: entradasGeo,
      geoJsonCaminos: caminosGeo,
      geoJsonEdificios: edificiosGeo,
      geoJsonPerimetro: perimetroGeo,
    }));
    this._services.set('navigationService', new NavigationService());

    // Services & Use Cases
    this._services.set('authUseCases', new AuthUseCases(this.get('authRepository')));
    this._services.set('buildingUseCases', new BuildingUseCases(this.get('buildingRepository')));
    this._services.set('eventUseCases', new EventUseCases(this.get('eventRepository')));
    this._services.set('routingService', new RoutingService({
      osrmClient: this.get('osrmClient'),
      dijkstraRoutingService: this.get('dijkstraRoutingService'),
      campusAccessService: this.get('campusAccessService'),
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
