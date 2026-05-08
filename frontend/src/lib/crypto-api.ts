import { decodeBase64Url, encodeBase64Url } from './base64url';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const PRIVATE_KEY_KDF_ITERATIONS = 210_000;
export const HKDF_INFO = 'convo:chat:v1';

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

export type EncryptedPrivateKeyMetadata = {
  encryptedPrivateKey: string;
  privateKeyIv: string;
  privateKeySalt: string;
  privateKeyKdfIterations: number;
};

export const decryptPrivateKey = async (
  password: string,
  metadata: EncryptedPrivateKeyMetadata,
): Promise<Uint8Array> => {
  const salt = decodeBase64Url(metadata.privateKeySalt);
  const iv = decodeBase64Url(metadata.privateKeyIv);
  const encrypted = decodeBase64Url(metadata.encryptedPrivateKey);

  const basePasswordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  const unwrappingKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: toArrayBuffer(salt),
      iterations: metadata.privateKeyKdfIterations,
    },
    basePasswordKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['decrypt'],
  );

  const pkcs8 = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
    },
    unwrappingKey,
    toArrayBuffer(encrypted),
  );

  return new Uint8Array(pkcs8);
};

export const importPrivateEcdhKey = async (
  pkcs8: Uint8Array,
): Promise<CryptoKey> => {
  return crypto.subtle.importKey(
    'pkcs8',
    toArrayBuffer(pkcs8),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits'],
  );
};

export const importPublicEcdhKey = async (
  spki: Uint8Array,
): Promise<CryptoKey> => {
  return crypto.subtle.importKey(
    'spki',
    toArrayBuffer(spki),
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    [],
  );
};

export const deriveSharedSecret = async (
  privateKey: CryptoKey,
  publicKey: CryptoKey,
): Promise<Uint8Array> => {
  const bits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: publicKey },
    privateKey,
    256,
  );
  return new Uint8Array(bits);
};

export type ChatKeys = {
  aesKey: CryptoKey;
  hmacKey: CryptoKey;
};

export const deriveChatKeys = async (
  sharedSecret: Uint8Array,
  hkdfSalt: Uint8Array,
): Promise<ChatKeys> => {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(sharedSecret),
    'HKDF',
    false,
    ['deriveBits'],
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: toArrayBuffer(hkdfSalt),
      info: encoder.encode(HKDF_INFO),
    },
    baseKey,
    512,
  );

  const derivedBytes = new Uint8Array(derived);
  const aesRaw = derivedBytes.slice(0, 32);
  const hmacRaw = derivedBytes.slice(32, 64);

  const [aesKey, hmacKey] = await Promise.all([
    crypto.subtle.importKey(
      'raw',
      toArrayBuffer(aesRaw),
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    ),
    crypto.subtle.importKey(
      'raw',
      toArrayBuffer(hmacRaw),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify'],
    ),
  ]);

  return { aesKey, hmacKey };
};

export type EncryptedMessage = {
  ciphertext: string;
  iv: string;
};

export const encryptMessage = async (
  plaintext: string,
  aesKey: CryptoKey,
): Promise<EncryptedMessage> => {
  const iv = getRandomBytes(12);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    aesKey,
    toArrayBuffer(encoder.encode(plaintext)),
  );

  return {
    ciphertext: encodeBase64Url(new Uint8Array(ciphertext)),
    iv: encodeBase64Url(iv),
  };
};

export const decryptMessage = async (
  ciphertext: string,
  iv: string,
  aesKey: CryptoKey,
): Promise<string> => {
  const ciphertextBytes = decodeBase64Url(ciphertext);
  const ivBytes = decodeBase64Url(iv);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(ivBytes) },
    aesKey,
    toArrayBuffer(ciphertextBytes),
  );

  return decoder.decode(plaintext);
};

export type MessageEnvelope = {
  version: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  iv: string;
  ciphertext: string;
  sentAt: string;
};

const canonicalizeEnvelope = (envelope: MessageEnvelope): Uint8Array => {
  const sortedKeys = Object.keys(envelope).sort() as (keyof MessageEnvelope)[];
  const ordered: Record<string, string> = {};
  sortedKeys.forEach((key) => {
    ordered[key] = envelope[key];
  });
  return encoder.encode(JSON.stringify(ordered));
};

export const signEnvelope = async (
  envelope: MessageEnvelope,
  hmacKey: CryptoKey,
): Promise<string> => {
  const canonical = canonicalizeEnvelope(envelope);
  const signature = await crypto.subtle.sign(
    'HMAC',
    hmacKey,
    toArrayBuffer(canonical),
  );
  return encodeBase64Url(new Uint8Array(signature));
};

export const verifyEnvelopeMac = async (
  envelope: MessageEnvelope,
  mac: string,
  hmacKey: CryptoKey,
): Promise<boolean> => {
  const canonical = canonicalizeEnvelope(envelope);
  let macBytes: Uint8Array;
  try {
    macBytes = decodeBase64Url(mac);
  } catch {
    return false;
  }

  return crypto.subtle.verify(
    'HMAC',
    hmacKey,
    toArrayBuffer(macBytes),
    toArrayBuffer(canonical),
  );
};
