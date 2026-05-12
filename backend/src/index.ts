import { OpenAPIHono } from '@hono/zod-openapi';
import { createBunWebSocket } from 'hono/bun';
import { cors } from 'hono/cors';

import { env } from './configs/env.config';
import { apiRouter } from './controllers/api.controller';
import type { AuthTokenPayload } from './types/auth.type';
import {
  authenticateRequest,
  buildChatWebSocketHandlers,
} from './ws/chat.websocket';

type AppVariables = {
  chatAuth: AuthTokenPayload;
};

const { upgradeWebSocket, websocket } = createBunWebSocket();

const app = new OpenAPIHono<{ Variables: AppVariables }>();

app.use('/api/*', async (c, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(c.req.method)) {
    await next();
    return;
  }

  const origin = c.req.header('Origin');

  if (origin && !env.FRONTEND_ORIGINS.includes(origin)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await next();
});

app.use(
  '/api/*',
  cors({
    origin: (origin) => (env.FRONTEND_ORIGINS.includes(origin) ? origin : null),
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  }),
);

app.get('/', (c) => c.json({ message: 'Convo backend is running' }));

app.get(
  '/api/ws',
  async (c, next) => {
    try {
      c.set('chatAuth', authenticateRequest(c));
    } catch {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    await next();
  },
  upgradeWebSocket((c) => buildChatWebSocketHandlers(c.get('chatAuth'))),
);

app.route('/api', apiRouter);

console.log(`Server listening on http://localhost:${env.PORT}`);

export default {
  port: env.PORT,
  fetch: app.fetch,
  websocket,
};
