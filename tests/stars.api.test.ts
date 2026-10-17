import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

const sirius = {
  name: 'Sirius',
  constellation: 'Canis Major',
  magnitude: -1.46,
  rightAscension: 6.752,
  declination: -16.716,
  spectralType: 'A1V',
};
const vega = { name: 'Vega', constellation: 'Lyra', magnitude: 0.03, rightAscension: 18.616, declination: 38.784 };
const polaris = { name: 'Polaris', constellation: 'Ursa Minor', magnitude: 1.98, rightAscension: 2.53, declination: 89.264 };

const missingId = '00000000-0000-4000-8000-000000000000';

describe('Star API', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = buildApp();
    await app.ready();
  });

  afterEach(() => app.close());

  const create = (payload: object) => app.inject({ method: 'POST', url: '/stars', payload });

  it('GET /health reports ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  describe('POST /stars', () => {
    it('creates a star and returns 201', async () => {
      const res = await create(sirius);
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body).toMatchObject(sirius);
      expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(body.createdAt).toBe(body.updatedAt);
    });

    it('rejects missing required fields', async () => {
      const res = await create({ name: 'Nameless' });
      expect(res.statusCode).toBe(400);
    });

    it.each([
      ['magnitude out of range', { ...vega, magnitude: 99 }],
      ['right ascension of 24h', { ...vega, rightAscension: 24 }],
      ['declination beyond the pole', { ...vega, declination: 91 }],
      ['blank name', { ...vega, name: '   ' }],
      ['non-numeric magnitude', { ...vega, magnitude: 'bright' }],
    ])('rejects %s', async (_label, payload) => {
      expect((await create(payload)).statusCode).toBe(400);
    });

    it('strips unknown fields', async () => {
      const res = await create({ ...vega, id: 'hijack', planets: 3 });
      expect(res.statusCode).toBe(201);
      expect(res.json().id).not.toBe('hijack');
      expect(res.json()).not.toHaveProperty('planets');
    });

    it('returns 409 for a duplicate name (case-insensitive)', async () => {
      await create(vega);
      const res = await create({ ...vega, name: 'VEGA' });
      expect(res.statusCode).toBe(409);
      expect(res.json().message).toContain('already exists');
    });
  });

  describe('GET /stars', () => {
    beforeEach(async () => {
      for (const star of [polaris, vega, sirius]) await create(star);
    });

    it('lists stars brightest first', async () => {
      const res = await app.inject({ method: 'GET', url: '/stars' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.total).toBe(3);
      expect(body.items.map((s: { name: string }) => s.name)).toEqual(['Sirius', 'Vega', 'Polaris']);
    });

    it('filters by constellation and magnitude', async () => {
      const byConstellation = await app.inject({ method: 'GET', url: '/stars?constellation=lyra' });
      expect(byConstellation.json().items.map((s: { name: string }) => s.name)).toEqual(['Vega']);

      const bright = await app.inject({ method: 'GET', url: '/stars?maxMagnitude=1' });
      expect(bright.json().total).toBe(2);
    });

    it('paginates with limit and offset', async () => {
      const res = await app.inject({ method: 'GET', url: '/stars?limit=1&offset=1' });
      expect(res.json()).toMatchObject({ total: 3, limit: 1, offset: 1, items: [{ name: 'Vega' }] });
    });

    it('rejects an invalid limit', async () => {
      const res = await app.inject({ method: 'GET', url: '/stars?limit=500' });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /stars/:id', () => {
    it('returns a star by id', async () => {
      const { id } = (await create(sirius)).json();
      const res = await app.inject({ method: 'GET', url: `/stars/${id}` });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ id, name: 'Sirius' });
    });

    it('returns 404 for an unknown id', async () => {
      expect((await app.inject({ method: 'GET', url: `/stars/${missingId}` })).statusCode).toBe(404);
    });

    it('returns 400 for a malformed id', async () => {
      expect((await app.inject({ method: 'GET', url: '/stars/not-a-uuid' })).statusCode).toBe(400);
    });
  });

  describe('PATCH /stars/:id', () => {
    it('updates selected fields', async () => {
      const { id, createdAt } = (await create(vega)).json();
      const res = await app.inject({ method: 'PATCH', url: `/stars/${id}`, payload: { magnitude: 0.026 } });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ ...vega, magnitude: 0.026, createdAt });
    });

    it('rejects an empty patch', async () => {
      const { id } = (await create(vega)).json();
      const res = await app.inject({ method: 'PATCH', url: `/stars/${id}`, payload: {} });
      expect(res.statusCode).toBe(400);
    });

    it('returns 409 when renaming to an existing name', async () => {
      await create(sirius);
      const { id } = (await create(vega)).json();
      const res = await app.inject({ method: 'PATCH', url: `/stars/${id}`, payload: { name: 'sirius' } });
      expect(res.statusCode).toBe(409);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await app.inject({ method: 'PATCH', url: `/stars/${missingId}`, payload: { magnitude: 1 } });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /stars/:id', () => {
    it('deletes a star', async () => {
      const { id } = (await create(polaris)).json();
      const res = await app.inject({ method: 'DELETE', url: `/stars/${id}` });
      expect(res.statusCode).toBe(204);
      expect((await app.inject({ method: 'GET', url: `/stars/${id}` })).statusCode).toBe(404);
    });

    it('returns 404 for an unknown id', async () => {
      expect((await app.inject({ method: 'DELETE', url: `/stars/${missingId}` })).statusCode).toBe(404);
    });
  });
});
