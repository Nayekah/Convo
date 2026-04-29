import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { AppNavbar } from '../components/NavBar';
import { PolaroidShowcase } from '../components/PolaroidShowcase';
import { usePageMeta } from '../lib/page-meta';

export const LandingPage = () => {
  usePageMeta({
    title: 'Convo | Secure Private Chat',
    description:
      'Convo is a secure private messaging app for end-to-end encrypted one-to-one conversations.',
  });

  return (
    <main className="page-shell landing-page">
      <AppNavbar />

      <section className="landing-content">
        <div className="landing-copy">
          <h1>
            Secure conversations,
            <br />
            without the noise.
          </h1>

          <p>CHAT ANYTIME, STAY PRIVATE.</p>
          <p>SECURE MESSAGES FOR EVERY MOMENT.</p>

          <div className="landing-actions">
            <Link className="primary-action" to="/signup">
              Get Started <ArrowRight size={28} strokeWidth={2.4} />
            </Link>
            <a
              className="secondary-action"
              href="https://github.com/Nayekah/Convo"
              target="_blank"
              rel="noreferrer"
            >
              <svg
                className="github-icon"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 2C6.5 2 2 6.6 2 12.3c0 4.5 2.9 8.4 6.8 9.8.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.6 1.1 1.6 1.1.9 1.6 2.4 1.1 2.9.9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.2-4.6-5.1 0-1.1.4-2.1 1.1-2.8-.1-.3-.5-1.4.1-2.8 0 0 .9-.3 2.9 1.1.8-.2 1.7-.3 2.6-.3s1.8.1 2.6.3c2-1.4 2.9-1.1 2.9-1.1.6 1.4.2 2.5.1 2.8.7.8 1.1 1.7 1.1 2.8 0 4-2.4 4.8-4.6 5.1.4.3.7 1 .7 2v3c0 .3.2.6.7.5 4-1.4 6.8-5.3 6.8-9.8C22 6.6 17.5 2 12 2Z" />
              </svg>
              Behind the Scene
            </a>
          </div>
        </div>

        <PolaroidShowcase />
      </section>
    </main>
  );
};
