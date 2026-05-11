import { MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';

import { AppNavbar } from '../components/NavBar';
import { ApiError } from '../lib/api';
import { chatApi } from '../lib/chat-api';
import { usePageMeta } from '../lib/page-meta';
import { getUser } from '../lib/session';
import type { Contact } from '../types/chat';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; contacts: Contact[] }
  | { status: 'error'; message: string };

export const ContactsPage = () => {
  usePageMeta({
    title: 'Convo | Contacts',
    description: 'Pick a Convo contact to start an encrypted conversation.',
  });

  const currentUser = getUser();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

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

  const handleSelect = (contact: Contact) => {
    // Slice 3c will replace this with conversation creation + navigation.
    console.log('Selected contact', contact);
  };

  return (
    <main className="page-shell contacts-page">
      <AppNavbar />

      <section className="contacts-layout">
        <header className="contacts-header">
          <h1>Contacts</h1>
          <p>
            {currentUser?.email
              ? `Signed in as ${currentUser.email}. Pick someone to start an encrypted conversation.`
              : 'Pick someone to start an encrypted conversation.'}
          </p>
        </header>

        {state.status === 'loading' ? (
          <div className="contacts-status">Loading contacts…</div>
        ) : null}

        {state.status === 'error' ? (
          <div className="contacts-status contacts-status--error">
            {state.message}
          </div>
        ) : null}

        {state.status === 'ready' && state.contacts.length === 0 ? (
          <div className="contacts-empty">
            <p>No one else has registered yet.</p>
            <p className="contacts-empty__hint">
              Open Convo in a second browser profile and create another account
              to start chatting.
            </p>
          </div>
        ) : null}

        {state.status === 'ready' && state.contacts.length > 0 ? (
          <ul className="contacts-list">
            {state.contacts.map((contact) => (
              <li key={contact.id}>
                <button
                  className="contact-card"
                  onClick={() => handleSelect(contact)}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="contact-card__avatar"
                  >
                    {contact.email.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="contact-card__body">
                    <span className="contact-card__email">{contact.email}</span>
                    <span className="contact-card__hint">
                      End-to-end encrypted
                    </span>
                  </span>
                  <MessageSquare
                    aria-hidden="true"
                    className="contact-card__icon"
                    size={20}
                    strokeWidth={2}
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
};
