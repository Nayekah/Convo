import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

const HASH_LENGTH = 64;

export const generateSalt = (size = 16): string => {
  return randomBytes(size).toString('base64url');
};

export const hashPassword = async (
  password: string,
  salt: string,
): Promise<string> => {
  const derived = (await scrypt(password, salt, HASH_LENGTH)) as Buffer;
  return derived.toString('base64url');
};

export const verifyPassword = async (
  password: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> => {
  const calculated = await hashPassword(password, salt);
  const expected = Buffer.from(expectedHash, 'base64url');
  const actual = Buffer.from(calculated, 'base64url');

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
};
