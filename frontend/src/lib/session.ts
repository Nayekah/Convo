import type { AuthUser } from '../types/auth';
import type { EncryptedPrivateKeyMetadata } from './crypto-api';

const USER_KEY = 'convo_auth_user';
const ENCRYPTED_KEY_META_KEY = 'convo_auth_enc_pk';

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

export const setEncryptedPrivateKeyMetadata = (
  metadata: EncryptedPrivateKeyMetadata,
): void => {
  sessionStorage.setItem(ENCRYPTED_KEY_META_KEY, JSON.stringify(metadata));
};

export const getEncryptedPrivateKeyMetadata =
  (): EncryptedPrivateKeyMetadata | null => {
    const raw = sessionStorage.getItem(ENCRYPTED_KEY_META_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as EncryptedPrivateKeyMetadata;
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
  sessionStorage.removeItem(ENCRYPTED_KEY_META_KEY);
  privateKeyInMemory = null;
};

export const isAuthenticated = (): boolean => {
  return getUser() !== null;
};
