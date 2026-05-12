export const CHAT_ALGORITHM = 'ECDH-P256+HKDF-SHA256+AES-256-GCM+HMAC-SHA256';

export type Contact = {
  id: string;
  email: string;
  publicKey: string;
};

export type ConversationInit = {
  id: string;
  contact: Contact;
  hkdfSalt: string;
};

export type EncryptedMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  ciphertext: string;
  iv: string;
  mac: string;
  algorithm: string;
  sentAt: string;
};

export type ContactsResponse = {
  contacts: Contact[];
};

export type ConversationResponse = {
  conversation: ConversationInit;
};

export type MessagesResponse = {
  messages: EncryptedMessage[];
};

export type OutgoingSendEvent = {
  type: 'message:send';
  conversationId: string;
  receiverId: string;
  ciphertext: string;
  iv: string;
  mac: string;
  algorithm: typeof CHAT_ALGORITHM;
  sentAt: string;
};

export type IncomingStoredEvent = {
  type: 'message:stored';
  message: EncryptedMessage;
};

export type IncomingReadyEvent = {
  type: 'connection:ready';
};

export type IncomingErrorEvent = {
  type: 'error';
  error: string;
};

export type IncomingWsEvent =
  | IncomingStoredEvent
  | IncomingReadyEvent
  | IncomingErrorEvent;
