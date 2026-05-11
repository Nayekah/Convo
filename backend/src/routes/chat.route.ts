import { createRoute, z } from '@hono/zod-openapi';

import { createConversationBodySchema } from '../types/chat.type';

const contactSchema = z.object({
  id: z.string(),
  email: z.email(),
  publicKey: z.string(),
});

const encryptedMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  receiverId: z.string(),
  ciphertext: z.string(),
  iv: z.string(),
  mac: z.string(),
  algorithm: z.string(),
  sentAt: z.string(),
});

const errorSchema = z.object({
  error: z.string(),
});

export const contactsRoute = createRoute({
  method: 'get',
  path: '/contacts',
  tags: ['chat'],
  responses: {
    200: {
      description: 'Contacts available for chat',
      content: {
        'application/json': {
          schema: z.object({
            contacts: z.array(contactSchema),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: errorSchema,
        },
      },
    },
  },
});

export const createConversationRoute = createRoute({
  method: 'post',
  path: '/conversations',
  tags: ['chat'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: createConversationBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Existing or newly created one-to-one conversation',
      content: {
        'application/json': {
          schema: z.object({
            conversation: z.object({
              id: z.string(),
              contact: contactSchema,
              hkdfSalt: z.string(),
            }),
          }),
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: errorSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: errorSchema,
        },
      },
    },
    404: {
      description: 'Contact not found',
      content: {
        'application/json': {
          schema: errorSchema,
        },
      },
    },
  },
});

export const conversationMessagesRoute = createRoute({
  method: 'get',
  path: '/conversations/{conversationId}/messages',
  tags: ['chat'],
  request: {
    params: z.object({
      conversationId: z.uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Encrypted message envelopes for a conversation',
      content: {
        'application/json': {
          schema: z.object({
            messages: z.array(encryptedMessageSchema),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: errorSchema,
        },
      },
    },
    404: {
      description: 'Conversation not found',
      content: {
        'application/json': {
          schema: errorSchema,
        },
      },
    },
  },
});
