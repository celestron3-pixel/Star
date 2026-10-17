const starFields = {
  name: { type: 'string', minLength: 1, maxLength: 100, pattern: '\\S' },
  constellation: { type: 'string', minLength: 1, maxLength: 50, pattern: '\\S' },
  magnitude: { type: 'number', minimum: -30, maximum: 30 },
  rightAscension: { type: 'number', minimum: 0, exclusiveMaximum: 24 },
  declination: { type: 'number', minimum: -90, maximum: 90 },
  spectralType: { type: 'string', minLength: 1, maxLength: 20 },
} as const;

const starRequired = ['name', 'constellation', 'magnitude', 'rightAscension', 'declination'];

export const starSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    ...starFields,
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
  required: ['id', ...starRequired, 'createdAt', 'updatedAt'],
} as const;

export const createStarBody = {
  type: 'object',
  additionalProperties: false,
  properties: starFields,
  required: starRequired,
} as const;

export const patchStarBody = {
  type: 'object',
  additionalProperties: false,
  minProperties: 1,
  properties: starFields,
} as const;

export const idParams = {
  type: 'object',
  properties: { id: { type: 'string', format: 'uuid' } },
  required: ['id'],
} as const;

export const listQuery = {
  type: 'object',
  additionalProperties: false,
  properties: {
    constellation: { type: 'string', minLength: 1, maxLength: 50 },
    maxMagnitude: { type: 'number' },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    offset: { type: 'integer', minimum: 0, default: 0 },
  },
} as const;

export const pageSchema = {
  type: 'object',
  properties: {
    items: { type: 'array', items: starSchema },
    total: { type: 'integer' },
    limit: { type: 'integer' },
    offset: { type: 'integer' },
  },
  required: ['items', 'total', 'limit', 'offset'],
} as const;
