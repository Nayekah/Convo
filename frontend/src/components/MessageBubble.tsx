export type DisplayMessage =
  | {
      id: string;
      status: 'ok';
      mine: boolean;
      plaintext: string;
      sentAt: string;
    }
  | {
      id: string;
      status: 'mac-invalid';
      mine: boolean;
      sentAt: string;
    }
  | {
      id: string;
      status: 'decrypt-failed';
      mine: boolean;
      sentAt: string;
    };

const formatTimestamp = (iso: string): string => {
  try {
    const date = new Date(iso);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

type MessageBubbleProps = {
  message: DisplayMessage;
};

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const side = message.mine ? 'mine' : 'theirs';
  const statusClass =
    message.status === 'ok'
      ? ''
      : message.status === 'mac-invalid'
        ? ' message-bubble--mac-invalid'
        : ' message-bubble--decrypt-failed';

  return (
    <div className={`message-row message-row--${side}`}>
      <div className={`message-bubble message-bubble--${side}${statusClass}`}>
        {message.status === 'ok' ? (
          <span className="message-bubble__text">{message.plaintext}</span>
        ) : null}
        {message.status === 'mac-invalid' ? (
          <span className="message-bubble__text">Message invalid</span>
        ) : null}
        {message.status === 'decrypt-failed' ? (
          <span className="message-bubble__text">
            Message cannot be decrypted
          </span>
        ) : null}
        <span className="message-bubble__time">
          {formatTimestamp(message.sentAt)}
        </span>
      </div>
    </div>
  );
};
