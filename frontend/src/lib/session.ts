import type { AuthUser } from '../types/auth';

const USER_KEY = 'convo_auth_user';

export type SessionUser = Pick<
  AuthUser,
  'id' | 'email' | 'publicKey' | 'createdAt'
>;

let privateKeyInMemory: CryptoKey | null = null;

export const setUser = (user: SessionUser): void => {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = (): SessionUser | null => {
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
};

export const setPrivateKey = (key: CryptoKey): void => {
  privateKeyInMemory = key;
};

export const getPrivateKey = (): CryptoKey | null => {
  return privateKeyInMemory;
};

export const hasPrivateKey = (): boolean => {
  return privateKeyInMemory !== null;
};

export const clearSession = (): void => {
  sessionStorage.removeItem(USER_KEY);
  privateKeyInMemory = null;
};

export const isAuthenticated = (): boolean => {
  return getUser() !== null;
};
