import { Navigate, Route, Routes } from 'react-router-dom';

import { RequireAuth } from './components/RequireAuth';
import { ChatEmptyState } from './pages/ChatEmptyState';
import { ChatPane } from './pages/ChatPane';
import { ChatShell } from './pages/ChatShell';
import { LandingPage } from './pages/LandingPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/contacts" element={<Navigate to="/chat" replace />} />
      <Route
        path="/chat"
        element={
          <RequireAuth>
            <ChatShell />
          </RequireAuth>
        }
      >
        <Route index element={<ChatEmptyState />} />
        <Route path=":conversationId" element={<ChatPane />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
