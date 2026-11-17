// tests/geo.test.js — API de capas geográficas (/api/geo).
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startTestApp } from './helpers.js';

let ctx;
let app;
let adminToken;
let studentToken;

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

const entrance = (id, lng, lat) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [lng, lat] },
  properties: { id, tipo: 'ENTRADA_EDIFICIO' },
});

before(async () => {
  ctx = await startTestApp();
  app = ctx.app;
  await new ctx.User({ email: 'admin@sigma.test', password: 'admin-password-123', role: 'administrador' }).save();
  adminToken = (await request(app).post('/api/auth/login').send({ email: 'admin@sigma.test', password: 'admin-password-123' })).body.token;
  studentToken = (await request(app).post('/api/auth/register').send({ email: 'est@sigma.test', password: 'secreto123' })).body.token;
});

after(async () => {
  await ctx.stop();
});

describe('Carga inicial desde los GeoJSON de la app', () => {
  test('seedGeoLayers carga las 4 capas y no duplica sin --force', async () => {
    const { seedGeoLayers } = await import('../scripts/seedGeoLayers.js');
    assert.deepEqual((await seedGeoLayers()).sort(), ['buildings', 'entrances', 'paths', 'perimeter']);
    assert.deepEqual(await seedGeoLayers(), []);
  });
});

describe('Lectura pública', () => {
  test('GET /api/geo devuelve las capas y una versión sin iniciar sesión', async () => {
    const res = await request(app).get('/api/geo');
    assert.equal(res.status, 200);
    assert.ok(res.body.version > 0);
    assert.equal(res.body.layers.buildings.features.length, 13);
    assert.equal(res.body.layers.paths.features.length, 132);
  });

  test('GET /api/geo/version es ligera', async () => {
    const res = await request(app).get('/api/geo/version');
    assert.equal(res.status, 200);
    assert.equal(res.body.layers.length, 4);
    assert.equal(res.body.layers.includes('paths'), true);
  });

  test('capa desconocida responde 404', async () => {
    assert.equal((await request(app).get('/api/geo/aulas')).status, 404);
  });
});

describe('Edición (solo administradores)', () => {
  test('sin sesión responde 401 y un estudiante 403', async () => {
    const body = { type: 'FeatureCollection', features: [entrance('EE-1', -98.12, 19.407)] };
    assert.equal((await request(app).put('/api/geo/entrances').send(body)).status, 401);
    assert.equal((await request(app).put('/api/geo/entrances').set(bearer(studentToken)).send(body)).status, 403);
  });

  test('rechaza coordenadas invertidas (lat, lng)', async () => {
    const body = { type: 'FeatureCollection', features: [entrance('EE-1', 19.407, -98.12)] };
    const res = await request(app).put('/api/geo/entrances').set(bearer(adminToken)).send(body);
    assert.equal(res.status, 400);
    assert.match(res.body.details[0].message, /fuera del área del campus/);
  });

  test('rechaza geometría no permitida para la capa', async () => {
    const line = { type: 'Feature', geometry: { type: 'LineString', coordinates: [[-98.12, 19.407], [-98.121, 19.408]] }, properties: { id: 'X' } };
    const res = await request(app)
      .put('/api/geo/entrances')
      .set(bearer(adminToken))
      .send({ type: 'FeatureCollection', features: [line] });
    assert.equal(res.status, 400);
  });

  test('rechaza ids repetidos', async () => {
    const body = { type: 'FeatureCollection', features: [entrance('EE-1', -98.12, 19.407), entrance('EE-1', -98.121, 19.4075)] };
    const res = await request(app).put('/api/geo/entrances').set(bearer(adminToken)).send(body);
    assert.equal(res.status, 400);
    assert.match(res.body.error, /repetido/);
  });

  test('valida tipos de los atributos de accesibilidad de caminos', async () => {
    const tramo = (props) => ({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[-98.12, 19.407], [-98.1205, 19.4072]] },
        properties: { id: 'C-1', ...props },
      }],
    });
    const bad = await request(app).put('/api/geo/paths').set(bearer(adminToken)).send(tramo({ escaleras: 'sí' }));
    assert.equal(bad.status, 400);
    const good = await request(app)
      .put('/api/geo/paths')
      .set(bearer(adminToken))
      .send(tramo({ escaleras: true, pendiente_pct: 6, superficie: 'pavimento', conexiones: '["EE-1"]' }));
    assert.equal(good.status, 200);
  });

  test('una edición válida sube la versión y conserva propiedades propias', async () => {
    const before = (await request(app).get('/api/geo/version')).body.version;
    await new Promise((resolve) => setTimeout(resolve, 5));
    const body = { type: 'FeatureCollection', features: [entrance('EE-1', -98.12, 19.407), entrance('EE-2', -98.121, 19.4075)] };
    const res = await request(app).put('/api/geo/entrances').set(bearer(adminToken)).send(body);
    assert.equal(res.status, 200);
    assert.equal(res.body.features, 2);

    const after = await request(app).get('/api/geo');
    assert.ok(after.body.version > before);
    assert.equal(after.body.layers.entrances.features[0].properties.tipo, 'ENTRADA_EDIFICIO');
  });
});
