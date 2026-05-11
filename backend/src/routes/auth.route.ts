import { createRoute, z } from '@hono/zod-openapi';

import { signinBodySchema, signupBodySchema } from '../types/auth.type';

const authUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  publicKey: z.string(),
  encryptedPrivateKey: z.string(),
  privateKeyIv: z.string(),
  privateKeySalt: z.string(),
  privateKeyKdfIterations: z.number().int(),
  privateKeyDeriveAlgorithm: z.string(),
  privateKeyCipher: z.string(),
  createdAt: z.string(),
});

export const signupRoute = createRoute({
  method: 'post',
  path: '/auth/signup',
  tags: ['auth'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: signupBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'User created',
      content: {
        'application/json': {
          schema: z.object({
            user: authUserSchema,
          }),
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
    409: {
      description: 'Conflict',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
    500: {
      description: 'Registration failed',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
  },
});

export const signinRoute = createRoute({
  method: 'post',
  path: '/auth/signin',
  tags: ['auth'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: signinBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Sign in success',
      content: {
        'application/json': {
          schema: z.object({
            user: authUserSchema,
          }),
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
  },
});

export const meRoute = createRoute({
  method: 'get',
  path: '/auth/me',
  tags: ['auth'],
  responses: {
    200: {
      description: 'Current authenticated user',
      content: {
        'application/json': {
          schema: z.object({
            user: authUserSchema,
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
  },
});
