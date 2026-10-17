import { randomUUID } from 'node:crypto';
import type { Page, Star, StarInput, StarPatch, StarQuery } from './types.js';

export class DuplicateStarError extends Error {
  constructor(name: string) {
    super(`A star named "${name}" already exists`);
    this.name = 'DuplicateStarError';
  }
}

export interface StarRepository {
  list(query: StarQuery): Page<Star>;
  get(id: string): Star | undefined;
  create(input: StarInput): Star;
  update(id: string, patch: StarPatch): Star | undefined;
  delete(id: string): boolean;
}

const normalize = (value: string) => value.trim().toLowerCase();

export class InMemoryStarRepository implements StarRepository {
  private readonly stars = new Map<string, Star>();

  constructor(private readonly now: () => Date = () => new Date()) {}

  list({ constellation, maxMagnitude, limit, offset }: StarQuery): Page<Star> {
    const matches = [...this.stars.values()]
      .filter((s) => constellation === undefined || normalize(s.constellation) === normalize(constellation))
      .filter((s) => maxMagnitude === undefined || s.magnitude <= maxMagnitude)
      .sort((a, b) => a.magnitude - b.magnitude || a.name.localeCompare(b.name));

    return { items: matches.slice(offset, offset + limit), total: matches.length, limit, offset };
  }

  get(id: string): Star | undefined {
    return this.stars.get(id);
  }

  create(input: StarInput): Star {
    this.assertUniqueName(input.name);
    const timestamp = this.now().toISOString();
    const star: Star = { ...input, id: randomUUID(), createdAt: timestamp, updatedAt: timestamp };
    this.stars.set(star.id, star);
    return star;
  }

  update(id: string, patch: StarPatch): Star | undefined {
    const existing = this.stars.get(id);
    if (!existing) return undefined;
    if (patch.name !== undefined) this.assertUniqueName(patch.name, id);

    const updated: Star = { ...existing, ...patch, id, updatedAt: this.now().toISOString() };
    this.stars.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.stars.delete(id);
  }

  private assertUniqueName(name: string, ignoreId?: string): void {
    for (const star of this.stars.values()) {
      if (star.id !== ignoreId && normalize(star.name) === normalize(name)) {
        throw new DuplicateStarError(name);
      }
    }
  }
}
