import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { isAuthenticated } from '../lib/session';

type RequireAuthProps = {
  children: ReactNode;
};

export const RequireAuth = ({ children }: RequireAuthProps) => {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};
