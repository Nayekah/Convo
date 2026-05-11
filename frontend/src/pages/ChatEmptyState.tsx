import { Lock } from 'lucide-react';

export const ChatEmptyState = () => {
  return (
    <div className="chat-empty">
      <div className="chat-empty__icon" aria-hidden="true">
        <Lock size={32} strokeWidth={1.8} />
      </div>
      <h2 className="chat-empty__title">Pick a contact to start chatting</h2>
      <p className="chat-empty__text">
        Every message is encrypted in your browser before it reaches the
        server. We can&apos;t read them, and neither can anyone listening on the
        wire.
      </p>
    </div>
  );
};
