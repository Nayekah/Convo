import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import { type DisplayMessage } from '../components/MessageBubble';
import { MessageList } from '../components/MessageList';
import { UnlockPrompt } from '../components/UnlockPrompt';
import { ApiError } from '../lib/api';
import { chatApi } from '../lib/chat-api';
import { getOrDeriveChatKeys } from '../lib/chat-keys-cache';
import {
  decryptMessage,
  verifyEnvelopeMac,
  type ChatKeys,
  type MessageEnvelope,
} from '../lib/crypto-api';
import { getUser, hasPrivateKey } from '../lib/session';
import type { ConversationInit, EncryptedMessage } from '../types/chat';

type LocationState = {
  conversation?: ConversationInit;
};

type LoadState =
  | { status: 'awaiting-conversation' }
  | { status: 'awaiting-key' }
  | { status: 'preparing' }
  | { status: 'ready'; messages: DisplayMessage[] }
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

  let macOk = false;
  try {
    macOk = await verifyEnvelopeMac(envelope, message.mac, chatKeys.hmacKey);
  } catch {
    macOk = false;
  }

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

  useEffect(() => {
    let cancelled = false;

    const prepare = async () => {
      if (!conversation || !conversationId || !userId) {
        setLoadState({ status: 'awaiting-conversation' });
        return;
      }
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
          setLoadState({ status: 'ready', messages: display });
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
            <Link to="/chat">Go back to your contacts</Link> and pick the
            person you want to talk to.
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
    </div>
  );
};
