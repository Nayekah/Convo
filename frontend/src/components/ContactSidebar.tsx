import { LogOut, MessageSquarePlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ApiError } from '../lib/api';
import { chatApi } from '../lib/chat-api';
import { clearSession, getUser } from '../lib/session';
import type { Contact, ConversationInit } from '../types/chat';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; contacts: Contact[] }
  | { status: 'error'; message: string };

export const ContactSidebar = () => {
  const navigate = useNavigate();
  const { conversationId: activeConversationId } = useParams();

  const currentUser = getUser();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [openingContactId, setOpeningContactId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await chatApi.listContacts();
        if (!cancelled) {
          setState({ status: 'ready', contacts: response.contacts });
        }
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof ApiError
            ? error.message
            : 'Unable to load contacts. Please try again.';
        setState({ status: 'error', message });
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelect = async (contact: Contact) => {
    if (openingContactId) return;
    setActionError(null);
    setOpeningContactId(contact.id);

    try {
      const response = await chatApi.createConversation(contact.id);
      const conversation: ConversationInit = response.conversation;
      navigate(`/chat/${conversation.id}`, {
        state: { conversation },
      });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Unable to open conversation.';
      setActionError(message);
    } finally {
      setOpeningContactId(null);
    }
  };

  const handleSignOut = () => {
    clearSession();
    navigate('/signin');
  };

  return (
    <aside className="chat-sidebar">
      <div className="chat-sidebar__profile">
        <div className="chat-sidebar__profile-text">
          <span className="chat-sidebar__profile-label">Signed in as</span>
          <span className="chat-sidebar__profile-email" title={currentUser?.email}>
            {currentUser?.email ?? 'Unknown'}
          </span>
        </div>
        <button
          aria-label="Sign out"
          className="chat-sidebar__signout"
          onClick={handleSignOut}
          type="button"
        >
          <LogOut size={18} strokeWidth={2} />
        </button>
      </div>

      <div className="chat-sidebar__heading">
        <MessageSquarePlus size={18} strokeWidth={2} />
        <span>Contacts</span>
      </div>

      {state.status === 'loading' ? (
        <div className="chat-sidebar__status">Loading contacts…</div>
      ) : null}

      {state.status === 'error' ? (
        <div className="chat-sidebar__status chat-sidebar__status--error">
          {state.message}
        </div>
      ) : null}

      {state.status === 'ready' && state.contacts.length === 0 ? (
        <div className="chat-sidebar__empty">
          <p>No one else has signed up yet.</p>
          <p className="chat-sidebar__empty-hint">
            Create a second account in another browser to start chatting.
          </p>
        </div>
      ) : null}

      {state.status === 'ready' && state.contacts.length > 0 ? (
        <ul className="chat-sidebar__list">
          {state.contacts.map((contact) => {
            const isOpening = openingContactId === contact.id;
            return (
              <li key={contact.id}>
                <button
                  className={`contact-row${
                    isOpening ? ' contact-row--opening' : ''
                  }`}
                  disabled={openingContactId !== null}
                  onClick={() => handleSelect(contact)}
                  type="button"
                >
                  <span className="contact-row__body">
                    <span className="contact-row__email">{contact.email}</span>
                    {isOpening ? (
                      <span className="contact-row__hint">
                        Opening conversation…
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {actionError ? (
        <div
          className="chat-sidebar__status chat-sidebar__status--error"
          role="alert"
        >
          {actionError}
        </div>
      ) : null}

      {/*
        activeConversationId is read just to keep React Router as the
        source of truth for which conversation is open. Active highlight
        will be added in slice 3d once we know how to map the conversation
        back to its contact without an extra round trip.
      */}
      <span hidden>{activeConversationId}</span>
    </aside>
  );
};
