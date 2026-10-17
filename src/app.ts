import Fastify, { type FastifyServerOptions } from 'fastify';
import { InMemoryStarRepository, type StarRepository } from './stars/repository.js';
import { starRoutes } from './stars/routes.js';

export interface AppOptions extends FastifyServerOptions {
  repository?: StarRepository;
}

export function buildApp({ repository = new InMemoryStarRepository(), ...fastifyOptions }: AppOptions = {}) {
  const app = Fastify(fastifyOptions);

  app.get('/health', async () => ({ status: 'ok' }));
  app.register(starRoutes, { prefix: '/stars', repository });

  return app;
}
