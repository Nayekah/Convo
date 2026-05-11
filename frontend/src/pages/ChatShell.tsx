import { Outlet } from 'react-router-dom';

import { ContactSidebar } from '../components/ContactSidebar';
import { usePageMeta } from '../lib/page-meta';

export const ChatShell = () => {
  usePageMeta({
    title: 'Convo | Chat',
    description: 'Encrypted private chat with your contacts on Convo.',
  });

  return (
    <main className="chat-shell">
      <ContactSidebar />
      <section className="chat-main">
        <Outlet />
      </section>
    </main>
  );
};
