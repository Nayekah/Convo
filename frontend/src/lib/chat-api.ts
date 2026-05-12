import { authedRequest } from './api';
import type {
  ContactsResponse,
  ConversationResponse,
  MessagesResponse,
} from '../types/chat';

export const chatApi = {
  listContacts: () => authedRequest<ContactsResponse>('/contacts'),

  createConversation: (contactId: string) =>
    authedRequest<ConversationResponse>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ contactId }),
    }),

  getMessages: (conversationId: string) =>
    authedRequest<MessagesResponse>(
      `/conversations/${conversationId}/messages`,
    ),
};
