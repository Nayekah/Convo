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

  if (message.status === 'mac-invalid') {
    return (
      <div className={`message-row message-row--${side}`}>
        <div
          className={`message-bubble message-bubble--${side} message-bubble--mac-invalid`}
        >
          <span className="message-bubble__failure-tag">
            HMAC verification failed
          </span>
          <span className="message-bubble__text">Message invalid</span>
          <span className="message-bubble__time">
            {formatTimestamp(message.sentAt)}
          </span>
        </div>
      </div>
    );
  }

  if (message.status === 'decrypt-failed') {
    return (
      <div className={`message-row message-row--${side}`}>
        <div
          className={`message-bubble message-bubble--${side} message-bubble--decrypt-failed`}
        >
          <span className="message-bubble__failure-tag">
            AES-GCM decryption failed
          </span>
          <span className="message-bubble__text">
            Message cannot be decrypted
          </span>
          <span className="message-bubble__time">
            {formatTimestamp(message.sentAt)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`message-row message-row--${side}`}>
      <div className={`message-bubble message-bubble--${side}`}>
        <span className="message-bubble__text">{message.plaintext}</span>
        <span className="message-bubble__time">
          {formatTimestamp(message.sentAt)}
        </span>
      </div>
    </div>
  );
};
