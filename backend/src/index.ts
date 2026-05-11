import { OpenAPIHono } from '@hono/zod-openapi';
import { createBunWebSocket } from 'hono/bun';
import { cors } from 'hono/cors';

import { env } from './configs/env.config';
import { apiRouter } from './controllers/api.controller';
import type { AuthTokenPayload } from './types/auth.type';
import {
  authenticateChatRequest,
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

  if (origin !== env.FRONTEND_ORIGIN) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await next();
});

app.use(
  '/api/*',
  cors({
    origin: env.FRONTEND_ORIGIN,
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
    const auth = authenticateChatRequest(c);

    if (!auth) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    c.set('chatAuth', auth);
    await next();
  },
  upgradeWebSocket((c) => {
    const auth = c.get('chatAuth');
    return buildChatWebSocketHandlers(auth);
  }),
);

app.route('/api', apiRouter);

console.log(`Server listening on http://localhost:${env.PORT}`);

export default {
  port: env.PORT,
  fetch: app.fetch,
  websocket,
};
