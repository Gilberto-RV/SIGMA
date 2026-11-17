// tests/api.test.js — pruebas de la API con MongoDB en memoria.
// Ejecutar: npm test
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { startTestApp } from './helpers.js';

let ctx;
let app;

const register = (body) => request(app).post('/api/auth/register').send(body);
const login = (email, password) => request(app).post('/api/auth/login').send({ email, password });
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

async function createAdminToken() {
  await new ctx.User({ email: 'admin@sigma.test', password: 'admin-password-123', role: 'administrador' }).save();
  const res = await login('admin@sigma.test', 'admin-password-123');
  assert.equal(res.status, 200);
  return res.body.token;
}

before(async () => {
  ctx = await startTestApp();
  app = ctx.app;
});

after(async () => {
  await ctx.stop();
});

describe('Registro (S1)', () => {
  test('crea estudiante por defecto y normaliza el correo', async () => {
    const res = await register({ email: '  Alumno@Sigma.Test ', password: 'secreto123' });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, 'estudiante');
    assert.equal(res.body.user.email, 'alumno@sigma.test');
    assert.ok(res.body.token);
  });

  test('permite elegir profesor', async () => {
    const res = await register({ email: 'profe@sigma.test', password: 'secreto123', role: 'profesor' });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, 'profesor');
  });

  test('rechaza registrarse como administrador', async () => {
    const res = await register({ email: 'intruso@sigma.test', password: 'secreto123', role: 'administrador' });
    assert.equal(res.status, 400);
    assert.equal(await ctx.User.countDocuments({ email: 'intruso@sigma.test' }), 0);
  });

  test('rechaza correo inválido y contraseña corta con detalle por campo', async () => {
    const res = await register({ email: 'no-es-correo', password: '123' });
    assert.equal(res.status, 400);
    const fields = res.body.details.map((d) => d.field).sort();
    assert.deepEqual(fields, ['email', 'password']);
  });

  test('rechaza correo duplicado con 409', async () => {
    const res = await register({ email: 'alumno@sigma.test', password: 'otra-clave-1' });
    assert.equal(res.status, 409);
  });
});

describe('Login y perfil (S2)', () => {
  let token;

  before(async () => {
    await register({ email: 'perfil@sigma.test', password: 'clave-inicial' });
    token = (await login('perfil@sigma.test', 'clave-inicial')).body.token;
  });

  test('login con contraseña incorrecta responde 401', async () => {
    const res = await login('perfil@sigma.test', 'equivocada');
    assert.equal(res.status, 401);
  });

  test('GET /me devuelve el usuario sin contraseña', async () => {
    const res = await request(app).get('/api/auth/me').set(bearer(token));
    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, 'perfil@sigma.test');
    assert.equal(res.body.user.password, undefined);
  });

  test('PUT /me no permite cambiar el rol', async () => {
    const res = await request(app).put('/api/auth/me').set(bearer(token)).send({ role: 'administrador' });
    assert.equal(res.status, 400);
    const user = await ctx.User.findOne({ email: 'perfil@sigma.test' });
    assert.equal(user.role, 'estudiante');
  });

  test('PUT /me no permite cambiar la contraseña sin la actual', async () => {
    const res = await request(app).put('/api/auth/me').set(bearer(token)).send({ password: 'nueva-clave' });
    assert.equal(res.status, 400);
  });

  test('PUT /me actualiza el avatar y conserva el rol', async () => {
    const res = await request(app)
      .put('/api/auth/me')
      .set(bearer(token))
      .send({ avatar: 'https://example.com/a.png' });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.avatar, 'https://example.com/a.png');
    assert.equal(res.body.user.role, 'estudiante');
  });

  test('cambio de contraseña exige la actual', async () => {
    const wrong = await request(app)
      .put('/api/auth/change-password')
      .set(bearer(token))
      .send({ currentPassword: 'equivocada', newPassword: 'clave-nueva-1' });
    assert.equal(wrong.status, 401);

    const ok = await request(app)
      .put('/api/auth/change-password')
      .set(bearer(token))
      .send({ currentPassword: 'clave-inicial', newPassword: 'clave-nueva-1' });
    assert.equal(ok.status, 200);
    assert.equal((await login('perfil@sigma.test', 'clave-nueva-1')).status, 200);
    assert.equal((await login('perfil@sigma.test', 'clave-inicial')).status, 401);
  });
});

describe('Tokens (S3)', () => {
  test('sin token responde 401', async () => {
    const res = await request(app).get('/api/events');
    assert.equal(res.status, 401);
  });

  test('un token firmado con el antiguo secreto por defecto es rechazado', async () => {
    const forged = jwt.sign({ userId: 'x', role: 'administrador' }, 'clave_secreta');
    const res = await request(app).get('/api/bigdata/stats').set(bearer(forged));
    assert.equal(res.status, 401);
  });

  test('un estudiante no puede crear eventos', async () => {
    await register({ email: 'est2@sigma.test', password: 'secreto123' });
    const token = (await login('est2@sigma.test', 'secreto123')).body.token;
    const res = await request(app)
      .post('/api/events')
      .set(bearer(token))
      .send({ title: 'x', date_time: '2026-12-01T10:00:00Z', organizer: 'y' });
    assert.equal(res.status, 403);
  });
});

describe('Eventos y categorías (admin)', () => {
  let adminToken;
  let categoryId;

  before(async () => {
    adminToken = await createAdminToken();
    const { ensureDefaultCategories } = await import('../services/categoryService.js');
    assert.equal(await ensureDefaultCategories(), 5);
    assert.equal(await ensureDefaultCategories(), 0, 'no duplica categorías');
  });

  test('GET /api/categories devuelve { _id, nombre } para el formulario de Gestory', async () => {
    const res = await request(app).get('/api/categories').set(bearer(adminToken));
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 5);
    assert.ok(res.body[0]._id && res.body[0].nombre);
    categoryId = res.body.find((c) => c.nombre === 'academica')._id;
  });

  test('crear, editar y borrar un evento (antes respondía 500)', async () => {
    const created = await request(app)
      .post('/api/events')
      .set(bearer(adminToken))
      .send({
        title: 'Semana de la Ciencia',
        description: 'Conferencias',
        building_assigned: ['E-12'],
        date_time: '2026-12-01T10:00:00Z',
        organizer: 'Depto. Sistemas',
        category: [categoryId],
        media: '',
      });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const id = created.body.event._id;
    assert.equal(created.body.event.category[0].nombre, 'academica');

    const updated = await request(app)
      .put(`/api/events/${id}`)
      .set(bearer(adminToken))
      .send({ status: 'en_curso' });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.event.status, 'en_curso');

    const stats = await request(app).get('/api/events/statistics/general').set(bearer(adminToken));
    assert.equal(stats.status, 200);
    assert.equal(stats.body.total, 1);
    assert.equal(stats.body.byStatus.en_curso, 1);

    const deleted = await request(app).delete(`/api/events/${id}`).set(bearer(adminToken));
    assert.equal(deleted.status, 200);

    const missing = await request(app).get(`/api/events/${id}`).set(bearer(adminToken));
    assert.equal(missing.status, 404);
  });

  test('evento sin título ni fecha responde 400', async () => {
    const res = await request(app).post('/api/events').set(bearer(adminToken)).send({ organizer: 'x' });
    assert.equal(res.status, 400);
    const fields = res.body.details.map((d) => d.field).sort();
    assert.deepEqual(fields, ['date_time', 'title']);
  });

  test('actualizar edificio con el payload que envía Gestory', async () => {
    const Building = (await import('../models/Building.js')).default;
    await Building.create({ _id: 'E-12', name: 'Biblioteca', floors: 2 });

    const res = await request(app)
      .put('/api/buildings/E-12')
      .set(bearer(adminToken))
      .send({
        _id: 'E-12', // Gestory puede incluirlo; se descarta
        geo_id: '',
        name: 'Biblioteca Central',
        description: 'Acervo general',
        accessibility: true,
        floors: 2,
        availability: true,
        student_frequency: 'medium',
        id_services: [],
        id_careers: [],
        bathrooms: { floor_1: true, floor_2: false, floor_3: false, floor_4: false, floor_5: false },
        entrances: [{ entrance_id: 'EE-12', description: 'Principal', location_hint: 'Entrada' }],
        subjects: [{ name: 'Lectura', id_subjects: null, floor: null }],
        media: '/uploads/biblioteca.jpg',
      });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.name, 'Biblioteca Central');
  });
});

describe('Endurecimiento HTTP (S4)', () => {
  test('cabeceras de seguridad de helmet', async () => {
    const res = await request(app).get('/');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-powered-by'], undefined);
    assert.equal(res.body.database, 'connected');
  });

  test('CORS permite Gestory en localhost y bloquea otros orígenes', async () => {
    const allowed = await request(app).get('/').set('Origin', 'http://localhost:5173');
    assert.equal(allowed.headers['access-control-allow-origin'], 'http://localhost:5173');

    const blocked = await request(app).get('/').set('Origin', 'https://sitio-malicioso.example');
    assert.equal(blocked.headers['access-control-allow-origin'], undefined);
  });

  test('JSON mal formado responde 400 y no 500', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    assert.equal(res.status, 400);
  });

  test('ruta inexistente responde 404', async () => {
    const res = await request(app).get('/api/no-existe');
    assert.equal(res.status, 404);
  });
});
