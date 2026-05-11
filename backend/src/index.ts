import { serve } from '@hono/node-server';
import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';

import { env } from './configs/env.config';
import { apiRouter } from './controllers/api.controller';
import { attachChatWebSocket } from './ws/chat.websocket';

const app = new OpenAPIHono();

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

app.route('/api', apiRouter);

const server = serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`Server listening on http://localhost:${info.port}`);
  },
);

attachChatWebSocket(server);
