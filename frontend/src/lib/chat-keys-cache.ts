import { decodeBase64Url } from './base64url';
import {
  deriveChatKeys,
  deriveSharedSecret,
  importPublicEcdhKey,
  type ChatKeys,
} from './crypto-api';
import { getPrivateKey } from './session';

const cache = new Map<string, ChatKeys>();

export const getOrDeriveChatKeys = async (
  conversationId: string,
  contactPublicKeyB64: string,
  hkdfSaltB64: string,
): Promise<ChatKeys> => {
  const cached = cache.get(conversationId);
  if (cached) return cached;

  const privateKey = getPrivateKey();
  if (!privateKey) {
    throw new Error('PrivateKeyUnavailable');
  }

  const contactPublicKey = await importPublicEcdhKey(
    decodeBase64Url(contactPublicKeyB64),
  );
  const sharedSecret = await deriveSharedSecret(privateKey, contactPublicKey);
  const hkdfSalt = decodeBase64Url(hkdfSaltB64);
  const keys = await deriveChatKeys(sharedSecret, hkdfSalt);

  cache.set(conversationId, keys);
  return keys;
};

export const clearChatKeysCache = (): void => {
  cache.clear();
};
