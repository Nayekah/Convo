import type { Prisma } from '@prisma/client';

import { prisma } from '../db/prisma';

export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: { email },
  });
};

export const createUser = async (values: Prisma.UserCreateInput) => {
  return prisma.user.create({
    data: values,
  });
};
