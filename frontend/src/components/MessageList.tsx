import { useEffect, useRef } from 'react';

import { MessageBubble, type DisplayMessage } from './MessageBubble';

type MessageListProps = {
  messages: DisplayMessage[];
};

export const MessageList = ({ messages }: MessageListProps) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="message-list message-list--empty">
        <p>No messages yet.</p>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={endRef} />
    </div>
  );
};
