import { useLocation, useParams } from 'react-router-dom';

import type { ConversationInit } from '../types/chat';

type LocationState = {
  conversation?: ConversationInit;
};

export const ChatPane = () => {
  useParams();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;
  const conversation = state.conversation;

  return (
    <div className="chat-pane">
      <header className="chat-pane__header">
        <div className="chat-pane__avatar" aria-hidden="true">
          {conversation?.contact.email.slice(0, 1).toUpperCase() ?? '?'}
        </div>
        <div className="chat-pane__header-text">
          <span className="chat-pane__title">
            {conversation?.contact.email ?? 'Conversation'}
          </span>
        </div>
      </header>

      <div className="chat-pane__body" />
    </div>
  );
};
