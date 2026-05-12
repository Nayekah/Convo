import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { z } from 'zod';

const currentDir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(currentDir, '../../../.env') });

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().default(9173),
  DATABASE_URL: z.url(),
  FRONTEND_ORIGIN: z.string().min(1).default('http://localhost:4021'),
  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),
  JWT_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().positive().default(3600),
  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const parseFrontendOrigins = (
  rawOrigins: string,
  nodeEnv: 'development' | 'test' | 'production',
) => {
  const configuredOrigins = rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const origins =
    nodeEnv === 'development'
      ? [...configuredOrigins, 'http://localhost:4021', 'http://127.0.0.1:4021']
      : configuredOrigins;

  const uniqueOrigins = [...new Set(origins)];
  const invalidOrigins = uniqueOrigins.filter((origin) => {
    try {
      new URL(origin);
      return false;
    } catch {
      return true;
    }
  });

  if (invalidOrigins.length > 0) {
    console.error('Invalid FRONTEND_ORIGIN values');
    console.error(invalidOrigins);
    process.exit(1);
  }

  return uniqueOrigins;
};

export const env = {
  ...parsed.data,
  FRONTEND_ORIGINS: parseFrontendOrigins(
    parsed.data.FRONTEND_ORIGIN,
    parsed.data.NODE_ENV,
  ),
};
