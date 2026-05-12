import { Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type MessageComposerProps = {
  disabled: boolean;
  onSend: (text: string) => Promise<void> | void;
};

export const MessageComposer = ({ disabled, onSend }: MessageComposerProps) => {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDisabled = disabled || isSending;

  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (trimmed.length === 0 || isDisabled) return;

    setError(null);
    setIsSending(true);
    try {
      await onSend(trimmed);
      setText('');
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : 'Unable to send message.',
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form className="message-composer" onSubmit={handleSubmit}>
      {error ? (
        <p className="message-composer__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="message-composer__row">
        <input
          aria-label="Type a message"
          autoComplete="off"
          className="message-composer__input"
          disabled={isDisabled}
          onChange={(event) => setText(event.target.value)}
          placeholder={
            disabled ? 'Connecting…' : 'Type a message and press Enter'
          }
          ref={inputRef}
          type="text"
          value={text}
        />
        <button
          aria-label="Send"
          className="message-composer__submit"
          disabled={isDisabled || text.trim().length === 0}
          type="submit"
        >
          <Send size={18} strokeWidth={2.2} />
        </button>
      </div>
    </form>
  );
};
