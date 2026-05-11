import { OpenAPIHono } from '@hono/zod-openapi';

import { authRouter } from './auth.controller';
import { chatRouter } from './chat.controller';

export const apiRouter = new OpenAPIHono();

apiRouter.route('/', authRouter);
apiRouter.route('/', chatRouter);
