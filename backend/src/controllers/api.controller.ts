import { OpenAPIHono } from '@hono/zod-openapi';

import { authRouter } from './auth.controller';

export const apiRouter = new OpenAPIHono();

apiRouter.route('/', authRouter);
