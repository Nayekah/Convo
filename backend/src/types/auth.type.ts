import { z } from 'zod';

export const signupBodySchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  publicKey: z.string().min(1),
  encryptedPrivateKey: z.string().min(1),
  privateKeyIv: z.string().min(1),
  privateKeySalt: z.string().min(1),
  privateKeyKdfIterations: z.number().int().positive(),
  privateKeyDeriveAlgorithm: z.string().min(1),
  privateKeyCipher: z.string().min(1),
});

export const signinBodySchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export type SignUpBody = z.infer<typeof signupBodySchema>;
export type SignInBody = z.infer<typeof signinBodySchema>;

export type AuthTokenPayload = {
  iss: string;
  aud: string;
  sub: string;
  iat: number;
  exp: number;
  jti: string;
  email: string;
};
