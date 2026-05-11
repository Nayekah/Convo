import { z } from 'zod';

export const createConversationBodySchema = z.object({
  contactId: z.uuid(),
});

export type CreateConversationBody = z.infer<
  typeof createConversationBodySchema
>;
