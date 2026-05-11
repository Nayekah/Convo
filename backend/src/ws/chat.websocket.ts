import { createHash } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';

import { z } from 'zod';
import type { ServerType } from '@hono/node-server';

import { env } from '../configs/env.config';
import { verify } from '../lib/jwt';
import {
  createEncryptedMessage,
  findConversationForParticipants,
} from '../repositories/chat.repository';
import type { AuthTokenPayload } from '../types/auth.type';

const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const CHAT_ALGORITHM = 'ECDH-P256+HKDF-SHA256+AES-256-GCM+HMAC-SHA256';
const ACCESS_TOKEN_COOKIE = '__Host-convo_access_token';

const activeConnections = new Map<string, Set<Duplex>>();

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

const parseCookies = (cookieHeader: string | undefined) => {
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

const getAccessToken = (request: IncomingMessage, url: URL) => {
  const cookieToken = parseCookies(request.headers.cookie).get(
    ACCESS_TOKEN_COOKIE,
  );

  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = request.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const protocols = request.headers['sec-websocket-protocol']
    ?.split(',')
    .map((protocol) => protocol.trim());

  if (protocols?.[0].toLowerCase() === 'bearer' && protocols[1]) {
    return protocols[1];
  }

  const token = url.searchParams.get('token');

  if (token) {
    return token;
  }

  return null;
};

const authenticateRequest = (request: IncomingMessage, url: URL) => {
  const token = getAccessToken(request, url);

  if (!token) {
    throw new Error('Unauthorized');
  }

  const decoded = verify(token, env.JWT_PUBLIC_KEY, {
    algs: ['ES256'],
    iss: env.JWT_ISSUER,
    aud: env.JWT_AUDIENCE,
  });

  return decoded.payload as AuthTokenPayload;
};

const rejectUpgrade = (socket: Duplex, statusCode: 400 | 401) => {
  const reason = statusCode === 401 ? 'Unauthorized' : 'Bad Request';
  socket.write(
    `HTTP/1.1 ${statusCode} ${reason}\r\nConnection: close\r\n\r\n`,
  );
  socket.destroy();
};

const acceptUpgrade = (socket: Duplex, key: string, protocol?: string) => {
  const acceptKey = createHash('sha1')
    .update(`${key}${WEBSOCKET_GUID}`)
    .digest('base64');

  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`,
  ];

  if (protocol) {
    headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
  }

  socket.write([...headers, '', ''].join('\r\n'));
};

const trackConnection = (userId: string, socket: Duplex) => {
  const existing = activeConnections.get(userId) ?? new Set<Duplex>();
  existing.add(socket);
  activeConnections.set(userId, existing);

  const cleanup = () => {
    existing.delete(socket);

    if (existing.size === 0) {
      activeConnections.delete(userId);
    }
  };

  socket.once('close', cleanup);
  socket.once('error', cleanup);
};

const encodeFrame = (payload: string, opcode = 0x1) => {
  const payloadBuffer = Buffer.from(payload, 'utf8');
  const header: number[] = [0x80 | opcode];

  if (payloadBuffer.length < 126) {
    header.push(payloadBuffer.length);
  } else if (payloadBuffer.length <= 0xffff) {
    header.push(
      126,
      (payloadBuffer.length >> 8) & 0xff,
      payloadBuffer.length & 0xff,
    );
  } else {
    const length = BigInt(payloadBuffer.length);
    header.push(
      127,
      Number((length >> 56n) & 0xffn),
      Number((length >> 48n) & 0xffn),
      Number((length >> 40n) & 0xffn),
      Number((length >> 32n) & 0xffn),
      Number((length >> 24n) & 0xffn),
      Number((length >> 16n) & 0xffn),
      Number((length >> 8n) & 0xffn),
      Number(length & 0xffn),
    );
  }

  return Buffer.concat([Buffer.from(header), payloadBuffer]);
};

const sendJson = (socket: Duplex, payload: unknown) => {
  if (!socket.destroyed) {
    socket.write(encodeFrame(JSON.stringify(payload)));
  }
};

const sendClose = (socket: Duplex, code = 1000) => {
  const payload = Buffer.allocUnsafe(2);
  payload.writeUInt16BE(code, 0);
  socket.end(Buffer.concat([Buffer.from([0x88, payload.length]), payload]));
};

const broadcastJson = (userIds: string[], payload: unknown) => {
  for (const userId of new Set(userIds)) {
    const sockets = activeConnections.get(userId);

    if (!sockets) {
      continue;
    }

    for (const socket of sockets) {
      sendJson(socket, payload);
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
  socket: Duplex,
  auth: AuthTokenPayload,
  raw: string,
) => {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(raw);
  } catch {
    sendJson(socket, { type: 'error', error: 'Invalid JSON message' });
    return;
  }

  const parsed = sendMessageSchema.safeParse(parsedJson);

  if (!parsed.success) {
    sendJson(socket, {
      type: 'error',
      error: parsed.error.issues[0]?.message ?? 'Invalid message',
    });
    return;
  }

  const event = parsed.data;

  if (event.receiverId === auth.sub) {
    sendJson(socket, {
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
    sendJson(socket, { type: 'error', error: 'Conversation not found' });
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

const parseFrames = (buffer: Buffer<ArrayBufferLike>) => {
  const frames: Array<{
    opcode: number;
    payload: Buffer<ArrayBufferLike>;
  }> = [];
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    const firstByte = buffer[offset];
    const secondByte = buffer[offset + 1];
    const opcode = firstByte & 0x0f;
    const isMasked = (secondByte & 0x80) === 0x80;
    let payloadLength = secondByte & 0x7f;
    let headerLength = 2;

    if (payloadLength === 126) {
      if (offset + 4 > buffer.length) {
        break;
      }

      payloadLength = buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (payloadLength === 127) {
      if (offset + 10 > buffer.length) {
        break;
      }

      const extendedLength = buffer.readBigUInt64BE(offset + 2);

      if (extendedLength > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error('WebSocket message is too large');
      }

      payloadLength = Number(extendedLength);
      headerLength = 10;
    }

    const maskLength = isMasked ? 4 : 0;
    const frameLength = headerLength + maskLength + payloadLength;

    if (offset + frameLength > buffer.length) {
      break;
    }

    const maskStart = offset + headerLength;
    const payloadStart = maskStart + maskLength;
    const payload = Buffer.from(
      buffer.subarray(payloadStart, payloadStart + payloadLength),
    );

    if (isMasked) {
      const mask = buffer.subarray(maskStart, maskStart + 4);

      for (let index = 0; index < payload.length; index += 1) {
        payload[index] ^= mask[index % 4];
      }
    }

    frames.push({ opcode, payload });
    offset += frameLength;
  }

  return {
    frames,
    remaining: buffer.subarray(offset),
  };
};

export const attachChatWebSocket = (server: ServerType) => {
  server.on('upgrade', (request, socket) => {
    const url = new URL(request.url ?? '/', `http://${request.headers.host}`);

    if (url.pathname !== '/api/ws') {
      socket.destroy();
      return;
    }

    const key = request.headers['sec-websocket-key'];

    if (
      request.headers.upgrade?.toLowerCase() !== 'websocket' ||
      typeof key !== 'string'
    ) {
      rejectUpgrade(socket, 400);
      return;
    }

    let auth: AuthTokenPayload;

    try {
      auth = authenticateRequest(request, url);
    } catch {
      rejectUpgrade(socket, 401);
      return;
    }

    const protocols = request.headers['sec-websocket-protocol']
      ?.split(',')
      .map((protocol: string) => protocol.trim().toLowerCase());
    const acceptedProtocol = protocols?.includes('bearer')
      ? 'bearer'
      : undefined;

    acceptUpgrade(socket, key, acceptedProtocol);
    trackConnection(auth.sub, socket);
    sendJson(socket, { type: 'connection:ready' });

    let buffered: Buffer<ArrayBufferLike> = Buffer.alloc(0);

    socket.on('data', (chunk: Buffer<ArrayBufferLike>) => {
      try {
        buffered = Buffer.concat([buffered, chunk]);
        const parsed = parseFrames(buffered);
        buffered = parsed.remaining;

        for (const frame of parsed.frames) {
          if (frame.opcode === 0x8) {
            sendClose(socket);
            return;
          }

          if (frame.opcode === 0x9) {
            socket.write(encodeFrame(frame.payload.toString('utf8'), 0xA));
            continue;
          }

          if (frame.opcode !== 0x1) {
            sendJson(socket, { type: 'error', error: 'Unsupported frame type' });
            continue;
          }

          void handleClientMessage(
            socket,
            auth,
            frame.payload.toString('utf8'),
          ).catch((error: unknown) => {
            sendJson(socket, {
              type: 'error',
              error:
                error instanceof Error ? error.message : 'Message send failed',
            });
          });
        }
      } catch (error) {
        sendJson(socket, {
          type: 'error',
          error: error instanceof Error ? error.message : 'WebSocket error',
        });
      }
    });
  });
};
