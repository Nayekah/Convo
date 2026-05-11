import type { Context } from 'hono';
import type { WSContext } from 'hono/ws';
import { z } from 'zod';

import { env } from '../configs/env.config';
import { verify } from '../lib/jwt';
import {
  createEncryptedMessage,
  findConversationForParticipants,
} from '../repositories/chat.repository';
import type { AuthTokenPayload } from '../types/auth.type';

const CHAT_ALGORITHM = 'ECDH-P256+HKDF-SHA256+AES-256-GCM+HMAC-SHA256';
const ACCESS_TOKEN_COOKIE = '__Host-convo_access_token';

const activeConnections = new Map<string, Set<WSContext>>();

const sendMessageSchema = z.object({
  type: z.literal('message:send'),
  conversationId: z.uuid(),
  receiverId: z.uuid(),
  ciphertext: z.string().min(1),
  iv: z.string().min(1),
  mac: z.string().min(1),
  algorithm: z.literal(CHAT_ALGORITHM),
  sentAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Invalid sentAt timestamp',
  }),
});

const parseCookies = (cookieHeader: string | null) => {
  const cookies = new Map<string, string>();

  for (const cookie of cookieHeader?.split(';') ?? []) {
    const separatorIndex = cookie.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const name = cookie.slice(0, separatorIndex).trim();
    const value = cookie.slice(separatorIndex + 1).trim();

    if (name) {
      cookies.set(name, decodeURIComponent(value));
    }
  }

  return cookies;
};

const getAccessToken = (c: Context): string | null => {
  const cookieToken = parseCookies(c.req.raw.headers.get('cookie')).get(
    ACCESS_TOKEN_COOKIE,
  );

  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = c.req.raw.headers.get('authorization');

  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const protocols = c.req.raw.headers
    .get('sec-websocket-protocol')
    ?.split(',')
    .map((protocol) => protocol.trim());

  if (protocols && protocols[0]?.toLowerCase() === 'bearer' && protocols[1]) {
    return protocols[1];
  }

  const token = c.req.query('token');

  if (token) {
    return token;
  }

  return null;
};

export const authenticateChatRequest = (c: Context): AuthTokenPayload | null => {
  const token = getAccessToken(c);

  if (!token) {
    return null;
  }

  try {
    const decoded = verify(token, env.JWT_PUBLIC_KEY, {
      algs: ['ES256'],
      iss: env.JWT_ISSUER,
      aud: env.JWT_AUDIENCE,
    });

    return decoded.payload as AuthTokenPayload;
  } catch {
    return null;
  }
};

const trackConnection = (userId: string, ws: WSContext) => {
  const existing = activeConnections.get(userId) ?? new Set<WSContext>();
  existing.add(ws);
  activeConnections.set(userId, existing);
};

const untrackConnection = (userId: string, ws: WSContext) => {
  const existing = activeConnections.get(userId);

  if (!existing) {
    return;
  }

  existing.delete(ws);

  if (existing.size === 0) {
    activeConnections.delete(userId);
  }
};

const sendJson = (ws: WSContext, payload: unknown) => {
  try {
    ws.send(JSON.stringify(payload));
  } catch {
    // socket has already closed; ignore
  }
};

const broadcastJson = (userIds: string[], payload: unknown) => {
  for (const userId of new Set(userIds)) {
    const sockets = activeConnections.get(userId);

    if (!sockets) {
      continue;
    }

    for (const ws of sockets) {
      sendJson(ws, payload);
    }
  }
};

const sanitizeMessage = (message: {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  ciphertext: string;
  iv: string;
  mac: string;
  algorithm: string;
  sentAt: Date;
}) => ({
  id: message.id,
  conversationId: message.conversationId,
  senderId: message.senderId,
  receiverId: message.receiverId,
  ciphertext: message.ciphertext,
  iv: message.iv,
  mac: message.mac,
  algorithm: message.algorithm,
  sentAt: message.sentAt.toISOString(),
});

const handleClientMessage = async (
  ws: WSContext,
  auth: AuthTokenPayload,
  raw: string,
) => {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(raw);
  } catch {
    sendJson(ws, { type: 'error', error: 'Invalid JSON message' });
    return;
  }

  const parsed = sendMessageSchema.safeParse(parsedJson);

  if (!parsed.success) {
    sendJson(ws, {
      type: 'error',
      error: parsed.error.issues[0]?.message ?? 'Invalid message',
    });
    return;
  }

  const event = parsed.data;

  if (event.receiverId === auth.sub) {
    sendJson(ws, {
      type: 'error',
      error: 'Receiver must be another user',
    });
    return;
  }

  const conversation = await findConversationForParticipants({
    conversationId: event.conversationId,
    userId: auth.sub,
    receiverId: event.receiverId,
  });

  if (!conversation) {
    sendJson(ws, { type: 'error', error: 'Conversation not found' });
    return;
  }

  const message = await createEncryptedMessage({
    conversationId: conversation.id,
    senderId: auth.sub,
    receiverId: event.receiverId,
    ciphertext: event.ciphertext,
    iv: event.iv,
    mac: event.mac,
    algorithm: event.algorithm,
    sentAt: new Date(event.sentAt),
  });

  broadcastJson([auth.sub, event.receiverId], {
    type: 'message:stored',
    message: sanitizeMessage(message),
  });
};

export const buildChatWebSocketHandlers = (auth: AuthTokenPayload) => ({
  onOpen: (_event: Event, ws: WSContext) => {
    trackConnection(auth.sub, ws);
    sendJson(ws, { type: 'connection:ready' });
  },
  onMessage: (event: MessageEvent, ws: WSContext) => {
    const data = event.data;
    const raw =
      typeof data === 'string'
        ? data
        : data instanceof ArrayBuffer
          ? new TextDecoder().decode(data)
          : '';

    void handleClientMessage(ws, auth, raw).catch((error: unknown) => {
      sendJson(ws, {
        type: 'error',
        error: error instanceof Error ? error.message : 'Message send failed',
      });
    });
  },
  onClose: (_event: CloseEvent, ws: WSContext) => {
    untrackConnection(auth.sub, ws);
  },
  onError: (_event: Event, ws: WSContext) => {
    untrackConnection(auth.sub, ws);
  },
});
