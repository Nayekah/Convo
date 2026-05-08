import { Navigate, Route, Routes } from 'react-router-dom';

import { RequireAuth } from './components/RequireAuth';
import { LandingPage } from './pages/LandingPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { getUser } from './lib/session';

const ContactsPlaceholder = () => {
  const user = getUser();
  return (
    <main className="page-shell">
      <h1>Signed in</h1>
      <p>Welcome, {user?.email ?? 'friend'}.</p>
      <p>The contacts and chat experience lands in the next workstream.</p>
    </main>
  );
};

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route
        path="/contacts"
        element={
          <RequireAuth>
            <ContactsPlaceholder />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
