import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import { type DisplayMessage } from '../components/MessageBubble';
import { MessageComposer } from '../components/MessageComposer';
import { MessageList } from '../components/MessageList';
import { UnlockPrompt } from '../components/UnlockPrompt';
import { ApiError } from '../lib/api';
import { chatApi } from '../lib/chat-api';
import { getOrDeriveChatKeys } from '../lib/chat-keys-cache';
import { ChatSocket } from '../lib/chat-socket';
import {
  decryptMessage,
  encryptMessage,
  signEnvelope,
  verifyEnvelopeMac,
  type ChatKeys,
  type MessageEnvelope,
} from '../lib/crypto-api';
import {
  getUser,
  hasPrivateKey,
  rememberConversationContact,
} from '../lib/session';
import {
  CHAT_ALGORITHM,
  type ConversationInit,
  type EncryptedMessage,
} from '../types/chat';

type LocationState = {
  conversation?: ConversationInit;
};

type LoadState =
  | { status: 'awaiting-conversation' }
  | { status: 'awaiting-key' }
  | { status: 'preparing' }
  | {
      status: 'ready';
      messages: DisplayMessage[];
      keys: ChatKeys;
    }
  | { status: 'error'; message: string };

const ENVELOPE_VERSION = '1';

const buildEnvelope = (message: EncryptedMessage): MessageEnvelope => ({
  version: ENVELOPE_VERSION,
  conversationId: message.conversationId,
  senderId: message.senderId,
  receiverId: message.receiverId,
  iv: message.iv,
  ciphertext: message.ciphertext,
  sentAt: message.sentAt,
});

const verifyAndDecrypt = async (
  message: EncryptedMessage,
  chatKeys: ChatKeys,
  myUserId: string,
): Promise<DisplayMessage> => {
  const envelope = buildEnvelope(message);
  const mine = message.senderId === myUserId;

  const macOk = await verifyEnvelopeMac(
    envelope,
    message.mac,
    chatKeys.hmacKey,
  ).catch(() => false);

  if (!macOk) {
    return {
      id: message.id,
      status: 'mac-invalid',
      mine,
      sentAt: message.sentAt,
    };
  }

  try {
    const plaintext = await decryptMessage(
      message.ciphertext,
      message.iv,
      chatKeys.aesKey,
    );
    return {
      id: message.id,
      status: 'ok',
      mine,
      plaintext,
      sentAt: message.sentAt,
    };
  } catch {
    return {
      id: message.id,
      status: 'decrypt-failed',
      mine,
      sentAt: message.sentAt,
    };
  }
};

export const ChatPane = () => {
  const { conversationId } = useParams();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;
  const conversation = state.conversation;

  const userId = getUser()?.id ?? null;
  const [loadState, setLoadState] = useState<LoadState>({
    status: 'awaiting-conversation',
  });
  const [unlockNonce, setUnlockNonce] = useState(0);
  const [socketReady, setSocketReady] = useState(false);
  const socketRef = useRef<ChatSocket | null>(null);

  // Effect 1: derive keys + fetch history
  useEffect(() => {
    let cancelled = false;

    const prepare = async () => {
      if (!conversation || !conversationId || !userId) {
        setLoadState({ status: 'awaiting-conversation' });
        return;
      }
      rememberConversationContact(conversation.id, conversation.contact.id);
      if (!hasPrivateKey()) {
        setLoadState({ status: 'awaiting-key' });
        return;
      }

      setLoadState({ status: 'preparing' });
      try {
        const chatKeys = await getOrDeriveChatKeys(
          conversation.id,
          conversation.contact.publicKey,
          conversation.hkdfSalt,
        );

        const response = await chatApi.getMessages(conversation.id);

        const display = await Promise.all(
          response.messages.map((message) =>
            verifyAndDecrypt(message, chatKeys, userId),
          ),
        );

        if (!cancelled) {
          setLoadState({ status: 'ready', messages: display, keys: chatKeys });
        }
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Unable to load conversation.';
        setLoadState({ status: 'error', message });
      }
    };

    void prepare();

    return () => {
      cancelled = true;
    };
  }, [conversation, conversationId, userId, unlockNonce]);

  // Effect 2: WebSocket lifecycle — connect once when conversation is ready,
  // close on unmount or conversation change.
  useEffect(() => {
    if (!conversation || !userId || loadState.status !== 'ready') {
      return;
    }

    const keys = loadState.keys;
    const socket = new ChatSocket({
      onReady: () => setSocketReady(true),
      onStored: async (event) => {
        if (event.message.conversationId !== conversation.id) return;
        const display = await verifyAndDecrypt(event.message, keys, userId);
        setLoadState((current) => {
          if (current.status !== 'ready') return current;

          // If this is the server's echo of a message we just sent, replace
          // the optimistic temp bubble we added on send.
          if (display.mine && display.status === 'ok') {
            const tempIndex = current.messages.findIndex(
              (m) =>
                m.id.startsWith('temp-') &&
                m.mine &&
                m.sentAt === display.sentAt,
            );
            if (tempIndex >= 0) {
              const updated = [...current.messages];
              updated[tempIndex] = display;
              return { ...current, messages: updated };
            }
          }

          if (current.messages.some((m) => m.id === display.id)) return current;
          return {
            ...current,
            messages: [...current.messages, display],
          };
        });
      },
      onError: (msg) => {
        console.warn('[chat-socket] error:', msg);
      },
      onClose: () => {
        setSocketReady(false);
      },
    });

    socket.connect();
    socketRef.current = socket;

    return () => {
      socket.close();
      socketRef.current = null;
      setSocketReady(false);
    };
    // We deliberately only re-run when the conversation or user identity
    // changes. Re-deriving chat keys via getOrDeriveChatKeys is cached, but
    // the keys object inside loadState is the trigger we react to so we
    // pull it fresh from loadState on each open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id, userId, loadState.status === 'ready']);

  const handleSend = async (text: string) => {
    if (
      loadState.status !== 'ready' ||
      !conversation ||
      !userId ||
      !socketRef.current
    ) {
      throw new Error('Not ready to send.');
    }

    const { ciphertext, iv } = await encryptMessage(
      text,
      loadState.keys.aesKey,
    );
    const sentAt = new Date().toISOString();
    const envelope: MessageEnvelope = {
      version: ENVELOPE_VERSION,
      conversationId: conversation.id,
      senderId: userId,
      receiverId: conversation.contact.id,
      iv,
      ciphertext,
      sentAt,
    };
    const mac = await signEnvelope(envelope, loadState.keys.hmacKey);

    socketRef.current.send({
      type: 'message:send',
      conversationId: conversation.id,
      receiverId: conversation.contact.id,
      ciphertext,
      iv,
      mac,
      algorithm: CHAT_ALGORITHM,
      sentAt,
    });

    const tempMessage: DisplayMessage = {
      id: `temp-${crypto.randomUUID()}`,
      status: 'ok',
      mine: true,
      plaintext: text,
      sentAt,
    };
    setLoadState((current) => {
      if (current.status !== 'ready') return current;
      return { ...current, messages: [...current.messages, tempMessage] };
    });
  };

  if (!conversationId) {
    return null;
  }

  if (!conversation) {
    return (
      <div className="chat-pane">
        <header className="chat-pane__header">
          <div className="chat-pane__header-text">
            <span className="chat-pane__title">Conversation</span>
          </div>
        </header>
        <div className="chat-pane__notice">
          <p>This conversation isn&apos;t loaded.</p>
          <p>
            <Link to="/chat">Go back to your contacts</Link> and pick the person
            you want to talk to.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-pane">
      <header className="chat-pane__header">
        <div className="chat-pane__header-text">
          <span className="chat-pane__title">{conversation.contact.email}</span>
        </div>
      </header>

      <div className="chat-pane__body">
        {loadState.status === 'awaiting-key' ? (
          <UnlockPrompt onUnlocked={() => setUnlockNonce((n) => n + 1)} />
        ) : null}

        {loadState.status === 'preparing' ? (
          <div className="chat-pane__notice">
            <p>Deriving chat keys and decrypting history…</p>
          </div>
        ) : null}

        {loadState.status === 'error' ? (
          <div className="chat-pane__notice chat-pane__notice--error">
            <p>{loadState.message}</p>
          </div>
        ) : null}

        {loadState.status === 'ready' ? (
          <MessageList messages={loadState.messages} />
        ) : null}
      </div>

      {loadState.status === 'ready' ? (
        <MessageComposer disabled={!socketReady} onSend={handleSend} />
      ) : null}
    </div>
  );
};
