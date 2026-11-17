// tests/rateLimit.test.js — archivo aparte: node --test usa un proceso por archivo,
// así el límite bajo no afecta a las demás pruebas.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startTestApp } from './helpers.js';

let ctx;

before(async () => {
  ctx = await startTestApp({ authRateLimit: '3' });
});

after(async () => {
  await ctx.stop();
});

test('el intento de login que excede el límite responde 429', async () => {
  const attempt = () =>
    request(ctx.app).post('/api/auth/login').send({ email: 'nadie@sigma.test', password: 'x' });

  for (let i = 0; i < 3; i += 1) {
    assert.equal((await attempt()).status, 401);
  }
  const blocked = await attempt();
  assert.equal(blocked.status, 429);
  assert.match(blocked.body.error, /Demasiados intentos/);
});
