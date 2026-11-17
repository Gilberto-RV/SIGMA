import { CampusAccessService } from './CampusAccessService.js';
import { campusAccessServiceOptions } from './campusGeoFixtures.node.js';

console.log('--- Probando CampusAccessService ---');

// Test 1: Instanciación e Inicialización Dinámica desde GeoJSONs
const campusAccessService = new CampusAccessService(campusAccessServiceOptions);
if (!campusAccessService || !(campusAccessService instanceof CampusAccessService)) {
  throw new Error('Falló instanciación de CampusAccessService');
}

// Test 2: Carga de accesos al campus (EP-003, AP-003, AP-004)
const campusEntrances = campusAccessService.getCampusEntrances();
if (!Array.isArray(campusEntrances) || campusEntrances.length < 3) {
  throw new Error(`Se esperaban al menos 3 accesos al campus y se cargaron ${campusEntrances.length}`);
}

const ep003 = campusAccessService.getAccessById('EP-003');
if (!ep003 || ep003.type !== 'CAMPUS_ENTRANCE' || !ep003.coordinate) {
  throw new Error('Falló carga de EP-003');
}

const ap003 = campusAccessService.getAccessById('AP-003');
if (!ap003 || ap003.type !== 'CAMPUS_ENTRANCE') {
  throw new Error('Falló carga de AP-003');
}

const ap004 = campusAccessService.getAccessById('AP-004');
if (!ap004 || ap004.type !== 'CAMPUS_ENTRANCE') {
  throw new Error('Falló carga de AP-004');
}

// Test 3: Existencia de entradas a edificios (EE-*)
const buildingEntrances = campusAccessService.getBuildingEntrances();
if (!Array.isArray(buildingEntrances) || buildingEntrances.length < 10) {
  throw new Error(`Se esperaban entradas a edificios y se cargaron ${buildingEntrances.length}`);
}

const ee12 = campusAccessService.getAccessById('EE-12');
if (!ee12 || ee12.type !== 'BUILDING_ENTRANCE' || ee12.buildingId !== 'E-12') {
  throw new Error('Falló carga de EE-12 o asociación con edificio E-12');
}

// Test 4: getBuildingEntrance(buildingId)
const entranceE12 = campusAccessService.getBuildingEntrance('E-12');
if (!entranceE12 || entranceE12.id !== 'EE-12') {
  throw new Error('Falló getBuildingEntrance para E-12');
}

// Test 5: findNearestCampusEntrance(coordinate)
const extCoordNearEp003 = { latitude: 19.4070, longitude: -98.1211 };
const nearestEntrance = campusAccessService.findNearestCampusEntrance(extCoordNearEp003);
if (!nearestEntrance || nearestEntrance.id !== 'EP-003') {
  throw new Error(`Se esperaba EP-003 como más cercana y se obtuvo ${nearestEntrance?.id}`);
}

// Test 6: Ignorar accesos disabled
const customService = new CampusAccessService(campusAccessServiceOptions);
const disabledEp003 = customService.getAccessById('EP-003');
disabledEp003.enabled = false;

const nearestWithDisabled = customService.findNearestCampusEntrance(extCoordNearEp003);
if (nearestWithDisabled.id === 'EP-003') {
  throw new Error('findNearestCampusEntrance debe ignorar accesos con enabled: false');
}

// Test 7: Manejo de Coordenadas Inválidas
let invalidCoordError = false;
try {
  campusAccessService.findNearestCampusEntrance({ latitude: 'invalid', longitude: 0 });
} catch (e) {
  invalidCoordError = e.code === 'INVALID_COORDINATE';
}
if (!invalidCoordError) throw new Error('Falló validación de coordenada inválida');

// Test 8: buildingId Inexistente
let buildingIdError = false;
try {
  campusAccessService.getBuildingEntrance('E-NONEXISTENT');
} catch (e) {
  buildingIdError = e.code === 'CAMPUS_ACCESS_NOT_FOUND';
}
if (!buildingIdError) throw new Error('Falló manejo de buildingId inexistente');

// Test 9: Acceso Inexistente
const nonExistentAccess = campusAccessService.getAccessById('ACCESS-NOT-EXIST');
if (nonExistentAccess !== null) {
  throw new Error('getAccessById debe retornar null para accesos inexistentes');
}

// Test 10: Geofencing isPointInCampus
const insidePoint = { latitude: 19.4075, longitude: -98.1200 };
const outsidePoint = { latitude: 19.3900, longitude: -98.1100 };

if (!campusAccessService.isPointInCampus(insidePoint)) {
  throw new Error('isPointInCampus debe retornar true para punto interno');
}
if (campusAccessService.isPointInCampus(outsidePoint)) {
  throw new Error('isPointInCampus debe retornar false para punto externo');
}

console.log('✅ Todos los 11 tests unitarios de CampusAccessService pasaron exitosamente!');
