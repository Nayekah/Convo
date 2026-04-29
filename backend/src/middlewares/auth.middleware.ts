import { createFactory } from 'hono/factory';

import { env } from '../configs/env.config';
import { verify } from '../lib/jwt';
import type { AuthTokenPayload } from '../types/auth.type';

const factory = createFactory<{
  Variables: {
    auth: AuthTokenPayload;
  };
}>();

export const authMiddleware = () => {
  return factory.createMiddleware(async (c, next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.slice(7);

    try {
      const decoded = verify(token, env.JWT_PUBLIC_KEY, {
        algs: ['ES256'],
        iss: env.JWT_ISSUER,
        aud: env.JWT_AUDIENCE,
      });

      c.set('auth', decoded.payload as AuthTokenPayload);
      await next();
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ error: error.message }, 401);
      }

      return c.json({ error: 'Unauthorized' }, 401);
    }
  });
};
