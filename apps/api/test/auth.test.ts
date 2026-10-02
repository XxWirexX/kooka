import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/db/index.js';
import { createMockAI } from '../src/modules/ai/mock.js';

const protectedApp = (secureCookie = true) =>
  createApp(openDatabase(':memory:'), { ai: createMockAI(), auth: { password: 'pâtes-carbo', secureCookie } });

describe('mot de passe', () => {
  it('bloque l’API sans session, sauf la santé et l’authentification', async () => {
    const app = protectedApp();
    expect((await request(app).get('/api/inventory')).status).toBe(401);
    expect((await request(app).get('/api/health')).status).toBe(200);
    expect((await request(app).get('/api/auth/me')).body).toEqual({ required: true, authenticated: false });
  });

  it('refuse un mauvais mot de passe', async () => {
    const res = await request(protectedApp()).post('/api/auth/login').send({ password: 'raté' });
    expect(res.status).toBe(401);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('ouvre une session avec le bon mot de passe, puis la ferme', async () => {
    // En production le cookie est « Secure » (HTTPS uniquement) ; ici le test tourne en HTTP.
    const secure = await request(protectedApp()).post('/api/auth/login').send({ password: 'pâtes-carbo' });
    expect(secure.headers['set-cookie']![0]).toMatch(/HttpOnly; SameSite=Lax; Max-Age=\d+; Secure/);

    const agent = request.agent(protectedApp(false));
    const login = await agent.post('/api/auth/login').send({ password: 'pâtes-carbo' });
    expect(login.status).toBe(200);

    expect((await agent.get('/api/inventory')).status).toBe(200);
    expect((await agent.get('/api/auth/me')).body.authenticated).toBe(true);

    await agent.post('/api/auth/logout');
    expect((await agent.get('/api/inventory')).status).toBe(401);
  });

  it('rejette un cookie falsifié', async () => {
    const forged = `kooka_session=${Date.now() + 1e9}.signature-inventee`;
    expect((await request(protectedApp()).get('/api/inventory').set('Cookie', forged)).status).toBe(401);
  });

  it('limite les tentatives de connexion', async () => {
    const app = protectedApp();
    for (let i = 0; i < 10; i++) await request(app).post('/api/auth/login').send({ password: 'x' });
    expect((await request(app).post('/api/auth/login').send({ password: 'pâtes-carbo' })).status).toBe(429);
  });

  it('sans mot de passe configuré (développement), tout est ouvert', async () => {
    const app = createApp(openDatabase(':memory:'), { ai: createMockAI() });
    expect((await request(app).get('/api/inventory')).status).toBe(200);
    expect((await request(app).get('/api/auth/me')).body).toEqual({ required: false, authenticated: true });
  });
});

describe('production', () => {
  it('limite le nombre d’appels IA par heure', async () => {
    const app = createApp(openDatabase(':memory:'), { ai: createMockAI(), aiCallsPerHour: 2 });
    await request(app).post('/api/inventory/quick-add').send({ text: 'riz, poulet' });
    expect((await request(app).post('/api/suggestions').send({})).status).toBe(200);
    expect((await request(app).post('/api/suggestions').send({ exclude: ['x'] })).status).toBe(200);
    expect((await request(app).post('/api/suggestions').send({ exclude: ['y'] })).status).toBe(429);
    // Les routes sans IA ne sont pas concernées.
    expect((await request(app).get('/api/inventory')).status).toBe(200);
  });

  it('sert le front compilé et renvoie index.html pour les routes de l’app', async () => {
    const dist = mkdtempSync(join(tmpdir(), 'kooka-web-'));
    writeFileSync(join(dist, 'index.html'), '<!doctype html><title>Kooka</title>');
    writeFileSync(join(dist, 'manifest.webmanifest'), '{}');
    const app = createApp(openDatabase(':memory:'), { ai: createMockAI(), webDist: dist });

    expect((await request(app).get('/cuisine/3')).text).toContain('<title>Kooka</title>');
    expect((await request(app).get('/manifest.webmanifest')).status).toBe(200);
    expect((await request(app).get('/api/nope')).status).toBe(404);
  });
});
