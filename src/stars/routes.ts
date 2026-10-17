import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { DuplicateStarError, type StarRepository } from './repository.js';
import { createStarBody, idParams, listQuery, pageSchema, patchStarBody, starSchema } from './schemas.js';
import type { StarInput, StarPatch, StarQuery } from './types.js';

export interface StarRoutesOptions {
  repository: StarRepository;
}

type IdParams = { Params: { id: string } };

const notFound = (reply: FastifyReply, id: string) =>
  reply.code(404).send({ statusCode: 404, error: 'Not Found', message: `Star ${id} not found` });

const conflict = (reply: FastifyReply, err: DuplicateStarError) =>
  reply.code(409).send({ statusCode: 409, error: 'Conflict', message: err.message });

export const starRoutes: FastifyPluginAsync<StarRoutesOptions> = async (app, { repository }) => {
  app.get<{ Querystring: StarQuery }>(
    '/',
    { schema: { querystring: listQuery, response: { 200: pageSchema } } },
    async (request) => repository.list(request.query),
  );

  app.get<IdParams>(
    '/:id',
    { schema: { params: idParams, response: { 200: starSchema } } },
    async (request, reply) => repository.get(request.params.id) ?? notFound(reply, request.params.id),
  );

  app.post<{ Body: StarInput }>(
    '/',
    { schema: { body: createStarBody, response: { 201: starSchema } } },
    async (request, reply) => {
      try {
        return reply.code(201).send(repository.create(request.body));
      } catch (err) {
        if (err instanceof DuplicateStarError) return conflict(reply, err);
        throw err;
      }
    },
  );

  app.patch<IdParams & { Body: StarPatch }>(
    '/:id',
    { schema: { params: idParams, body: patchStarBody, response: { 200: starSchema } } },
    async (request, reply) => {
      try {
        return repository.update(request.params.id, request.body) ?? notFound(reply, request.params.id);
      } catch (err) {
        if (err instanceof DuplicateStarError) return conflict(reply, err);
        throw err;
      }
    },
  );

  app.delete<IdParams>('/:id', { schema: { params: idParams } }, async (request, reply) =>
    repository.delete(request.params.id) ? reply.code(204).send() : notFound(reply, request.params.id),
  );
};
