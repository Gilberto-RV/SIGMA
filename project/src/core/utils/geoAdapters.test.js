import {
  isValidCoordinate,
  isValidGeoJSONPosition,
  coordinateToGeoJSON,
  geoJSONToCoordinate,
  coordinatesToGeoJSON,
  geoJSONToCoordinates,
  featureToPoint,
  featureToLineString,
  featureToPolygon,
} from './geoAdapters.js';

// Simple unit test validation runner for Node.js
console.log('--- Probando geoAdapters.js ---');

// Test 1: Validation
const c1 = { latitude: 19.4074, longitude: -98.1198 };
const p1 = [-98.1198, 19.4074];

if (!isValidCoordinate(c1)) throw new Error('Falló isValidCoordinate con coordenada válida');
if (isValidCoordinate({ latitude: 'invalid', longitude: 0 })) throw new Error('Falló isValidCoordinate con coordenada inválida');
if (!isValidGeoJSONPosition(p1)) throw new Error('Falló isValidGeoJSONPosition con posición válida');

// Test 2: Conversion
const convertedPos = coordinateToGeoJSON(c1);
if (convertedPos[0] !== -98.1198 || convertedPos[1] !== 19.4074) throw new Error('Falló coordinateToGeoJSON');

const convertedCoord = geoJSONToCoordinate(p1);
if (convertedCoord.latitude !== 19.4074 || convertedCoord.longitude !== -98.1198) throw new Error('Falló geoJSONToCoordinate');

// Test 3: Arrays
const coordsArr = [c1, { latitude: 19.408, longitude: -98.12 }];
const geoArr = coordinatesToGeoJSON(coordsArr);
if (geoArr.length !== 2 || geoArr[0][0] !== -98.1198) throw new Error('Falló coordinatesToGeoJSON');

const backToCoords = geoJSONToCoordinates(geoArr);
if (backToCoords.length !== 2 || backToCoords[0].latitude !== 19.4074) throw new Error('Falló geoJSONToCoordinates');

// Test 4: Features
const pointFeat = featureToPoint(c1, { name: 'Entrada' }, 'EP-001');
if (pointFeat.type !== 'Feature' || pointFeat.geometry.type !== 'Point' || pointFeat.id !== 'EP-001') {
  throw new Error('Falló featureToPoint');
}

const lineFeat = featureToLineString([c1, { latitude: 19.408, longitude: -98.12 }], { tipo: 'CAMINO' });
if (lineFeat.geometry.type !== 'LineString' || lineFeat.geometry.coordinates.length !== 2) {
  throw new Error('Falló featureToLineString');
}

const polyFeat = featureToPolygon([
  c1,
  { latitude: 19.408, longitude: -98.1198 },
  { latitude: 19.408, longitude: -98.12 },
], { name: 'Edificio' });
if (polyFeat.geometry.type !== 'Polygon' || polyFeat.geometry.coordinates[0].length !== 4) {
  throw new Error('Falló featureToPolygon (no cerró el anillo correctamente)');
}

console.log('✅ Todos los tests unitarios de geoAdapters.js pasaron exitosamente!');
