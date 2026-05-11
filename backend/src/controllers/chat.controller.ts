import type { AuthTokenPayload } from '../types/auth.type';
import { createConversationBodySchema } from '../types/chat.type';
import { generateSalt } from '../utils/password';
import { createRouter } from '../utils/router-factory';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  contactsRoute,
  conversationMessagesRoute,
  createConversationRoute,
} from '../routes/chat.route';
import {
  findContactsExcludingUser,
  findConversationForUser,
  findConversationMessages,
  findUserPublicProfileById,
  getOrCreateOneToOneConversation,
} from '../repositories/chat.repository';

export const chatRouter = createRouter();

const getAuth = (c: { get: (key: string) => unknown }) => {
  return c.get('auth') as AuthTokenPayload;
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

chatRouter.use('/contacts', authMiddleware());
chatRouter.use('/conversations', authMiddleware());
chatRouter.use('/conversations/*', authMiddleware());

chatRouter.openapi(contactsRoute, async (c) => {
  const auth = getAuth(c);
  const contacts = await findContactsExcludingUser(auth.sub);

  return c.json({ contacts }, 200);
});

chatRouter.openapi(createConversationRoute, async (c) => {
  const auth = getAuth(c);
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const parsed = createConversationBodySchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      400,
    );
  }

  if (parsed.data.contactId === auth.sub) {
    return c.json({ error: 'Contact must be another user' }, 400);
  }

  const contact = await findUserPublicProfileById(parsed.data.contactId);

  if (!contact) {
    return c.json({ error: 'Contact not found' }, 404);
  }

  const conversation = await getOrCreateOneToOneConversation({
    userId: auth.sub,
    contactId: contact.id,
    hkdfSalt: generateSalt(32),
  });

  return c.json(
    {
      conversation: {
        id: conversation.id,
        contact,
        hkdfSalt: conversation.hkdfSalt,
      },
    },
    200,
  );
});

chatRouter.openapi(conversationMessagesRoute, async (c) => {
  const auth = getAuth(c);
  const { conversationId } = c.req.valid('param');

  const conversation = await findConversationForUser({
    conversationId,
    userId: auth.sub,
  });

  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  const messages = await findConversationMessages(conversation.id);

  return c.json({ messages: messages.map(sanitizeMessage) }, 200);
});
