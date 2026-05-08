import { Prisma } from '@prisma/client';
import type { Context } from 'hono';
import { setCookie } from 'hono/cookie';

import { env } from '../configs/env.config';
import { sign } from '../lib/jwt';
import { authMiddleware } from '../middlewares/auth.middleware';
import { createUser, findUserByEmail } from '../repositories/auth.repository';
import { meRoute, signinRoute, signupRoute } from '../routes/auth.route';
import type { AuthTokenPayload } from '../types/auth.type';
import { signinBodySchema, signupBodySchema } from '../types/auth.type';
import { generateSalt, hashPassword, verifyPassword } from '../utils/password';
import { createRouter } from '../utils/router-factory';

export const authRouter = createRouter();

const ACCESS_TOKEN_COOKIE = '__Host-convo_access_token';

const createAccessToken = (payload: { userId: string; email: string }) => {
  const now = Math.floor(Date.now() / 1000);

  return sign({
    header: {
      alg: 'ES256',
      typ: 'JWT',
    },
    claims: {
      iss: env.JWT_ISSUER,
      aud: env.JWT_AUDIENCE,
      sub: payload.userId,
      iat: now,
      exp: now + env.JWT_ACCESS_TOKEN_TTL_SECONDS,
      jti: crypto.randomUUID(),
    },
    payload: {
      email: payload.email,
    },
    privateKey: env.JWT_PRIVATE_KEY,
  });
};

const setAccessTokenCookie = (c: Context, token: string) => {
  setCookie(c, ACCESS_TOKEN_COOKIE, token, {
    httpOnly: true,
    maxAge: env.JWT_ACCESS_TOKEN_TTL_SECONDS,
    path: '/',
    sameSite: 'Lax',
    secure: true,
  });
};

const sanitizeUser = (user: {
  id: string;
  email: string;
  publicKey: string;
  encryptedPrivateKey: string;
  privateKeyIv: string;
  privateKeySalt: string;
  privateKeyKdfIterations: number;
  privateKeyDeriveAlgorithm: string;
  privateKeyCipher: string;
  createdAt: Date;
}) => ({
  id: user.id,
  email: user.email,
  publicKey: user.publicKey,
  encryptedPrivateKey: user.encryptedPrivateKey,
  privateKeyIv: user.privateKeyIv,
  privateKeySalt: user.privateKeySalt,
  privateKeyKdfIterations: user.privateKeyKdfIterations,
  privateKeyDeriveAlgorithm: user.privateKeyDeriveAlgorithm,
  privateKeyCipher: user.privateKeyCipher,
  createdAt: user.createdAt.toISOString(),
});

authRouter.openapi(signupRoute, async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const parsed = signupBodySchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      400,
    );
  }

  const existingUser = await findUserByEmail(parsed.data.email);

  if (existingUser) {
    return c.json({ error: 'Email already registered' }, 409);
  }

  try {
    const passwordSalt = generateSalt();
    const passwordHash = await hashPassword(parsed.data.password, passwordSalt);

    const createdUser = await createUser({
      email: parsed.data.email,
      passwordHash,
      passwordSalt,
      publicKey: parsed.data.publicKey,
      encryptedPrivateKey: parsed.data.encryptedPrivateKey,
      privateKeyIv: parsed.data.privateKeyIv,
      privateKeySalt: parsed.data.privateKeySalt,
      privateKeyKdfIterations: parsed.data.privateKeyKdfIterations,
      privateKeyDeriveAlgorithm: parsed.data.privateKeyDeriveAlgorithm,
      privateKeyCipher: parsed.data.privateKeyCipher,
    });

    const token = createAccessToken({
      userId: createdUser.id,
      email: createdUser.email,
    });

    setAccessTokenCookie(c, token);

    return c.json(
      {
        user: sanitizeUser(createdUser),
      },
      201,
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return c.json({ error: 'Email already registered' }, 409);
    }

    console.error('Register failed', error);
    return c.json({ error: 'Registration failed' }, 500);
  }
});

authRouter.openapi(signinRoute, async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const parsed = signinBodySchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      400,
    );
  }

  const user = await findUserByEmail(parsed.data.email);

  if (!user) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const passwordMatches = await verifyPassword(
    parsed.data.password,
    user.passwordSalt,
    user.passwordHash,
  );

  if (!passwordMatches) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const token = createAccessToken({
    userId: user.id,
    email: user.email,
  });

  setAccessTokenCookie(c, token);

  return c.json(
    {
      user: sanitizeUser(user),
    },
    200,
  );
});

authRouter.use('/auth/me', authMiddleware());

authRouter.openapi(meRoute, async (c) => {
  const auth = (c as unknown as { get: (key: string) => unknown }).get(
    'auth',
  ) as AuthTokenPayload;

  const user = await findUserByEmail(auth.email);

  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  return c.json({ user: sanitizeUser(user) }, 200);
});
