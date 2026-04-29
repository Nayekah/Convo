import { encodeBase64Url } from './base64url';

const encoder = new TextEncoder();

export const PRIVATE_KEY_KDF_ITERATIONS = 210_000;

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
};

const getRandomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};

export const createEncryptedEcdhKeys = async (password: string) => {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveBits'],
  );

  const [publicKeyBytes, privateKeyBytes] = await Promise.all([
    crypto.subtle.exportKey('spki', keyPair.publicKey),
    crypto.subtle.exportKey('pkcs8', keyPair.privateKey),
  ]);

  const iv = getRandomBytes(12);
  const salt = getRandomBytes(16);

  const basePasswordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  const wrappingKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: toArrayBuffer(salt),
      iterations: PRIVATE_KEY_KDF_ITERATIONS,
    },
    basePasswordKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt'],
  );

  const encryptedPrivateKey = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
    },
    wrappingKey,
    privateKeyBytes,
  );

  return {
    publicKey: encodeBase64Url(new Uint8Array(publicKeyBytes)),
    encryptedPrivateKey: encodeBase64Url(new Uint8Array(encryptedPrivateKey)),
    privateKeyIv: encodeBase64Url(iv),
    privateKeySalt: encodeBase64Url(salt),
    privateKeyKdfIterations: PRIVATE_KEY_KDF_ITERATIONS,
    privateKeyDeriveAlgorithm: 'PBKDF2-SHA-256',
    privateKeyCipher: 'AES-256-GCM',
  };
};
