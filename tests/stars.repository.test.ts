import { describe, expect, it } from 'vitest';
import { DuplicateStarError, InMemoryStarRepository } from '../src/stars/repository.js';

const deneb = { name: 'Deneb', constellation: 'Cygnus', magnitude: 1.25, rightAscension: 20.69, declination: 45.28 };

describe('InMemoryStarRepository', () => {
  it('stamps createdAt and updatedAt from the injected clock', () => {
    const times = [new Date('2026-01-01T00:00:00Z'), new Date('2026-01-02T00:00:00Z')];
    const repo = new InMemoryStarRepository(() => times.shift()!);

    const created = repo.create(deneb);
    expect(created.createdAt).toBe('2026-01-01T00:00:00.000Z');

    const updated = repo.update(created.id, { magnitude: 1.3 })!;
    expect(updated.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(updated.updatedAt).toBe('2026-01-02T00:00:00.000Z');
  });

  it('rejects duplicate names, ignoring case and whitespace', () => {
    const repo = new InMemoryStarRepository();
    repo.create(deneb);
    expect(() => repo.create({ ...deneb, name: ' deneb ' })).toThrow(DuplicateStarError);
  });

  it('allows a star to keep its own name on update', () => {
    const repo = new InMemoryStarRepository();
    const { id } = repo.create(deneb);
    expect(repo.update(id, { name: 'DENEB' })?.name).toBe('DENEB');
  });

  it('returns undefined / false for unknown ids', () => {
    const repo = new InMemoryStarRepository();
    expect(repo.get('missing')).toBeUndefined();
    expect(repo.update('missing', { magnitude: 1 })).toBeUndefined();
    expect(repo.delete('missing')).toBe(false);
  });
});
