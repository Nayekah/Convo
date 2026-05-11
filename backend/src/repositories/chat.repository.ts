import { prisma } from '../db/prisma';

const orderedParticipantIds = (userId: string, contactId: string) => {
  return [userId, contactId].sort((a, b) => a.localeCompare(b));
};

export const findContactsExcludingUser = async (userId: string) => {
  return prisma.user.findMany({
    where: {
      id: {
        not: userId,
      },
    },
    orderBy: {
      email: 'asc',
    },
    select: {
      id: true,
      email: true,
      publicKey: true,
    },
  });
};

export const findUserPublicProfileById = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      publicKey: true,
    },
  });
};

export const getOrCreateOneToOneConversation = async ({
  userId,
  contactId,
  hkdfSalt,
}: {
  userId: string;
  contactId: string;
  hkdfSalt: string;
}) => {
  const [userAId, userBId] = orderedParticipantIds(userId, contactId);

  return prisma.conversation.upsert({
    where: {
      userAId_userBId: {
        userAId,
        userBId,
      },
    },
    create: {
      userAId,
      userBId,
      hkdfSalt,
    },
    update: {},
  });
};

export const findConversationForUser = async ({
  conversationId,
  userId,
}: {
  conversationId: string;
  userId: string;
}) => {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ userAId: userId }, { userBId: userId }],
    },
  });
};

export const findConversationMessages = async (conversationId: string) => {
  return prisma.message.findMany({
    where: {
      conversationId,
    },
    orderBy: {
      sentAt: 'asc',
    },
    select: {
      id: true,
      conversationId: true,
      senderId: true,
      receiverId: true,
      ciphertext: true,
      iv: true,
      mac: true,
      algorithm: true,
      sentAt: true,
    },
  });
};
