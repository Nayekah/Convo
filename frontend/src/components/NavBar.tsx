import { LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';

import { WhiteBoxLogo } from './WhiteBoxLogo';

export const AppNavbar = () => {
  return (
    <header className="app-navbar">
      <WhiteBoxLogo />

      <div className="app-navbar__spacer" />

      <div className="app-navbar__auth">
        <Link to="/signin">
          <LogIn size={20} strokeWidth={2.2} /> Sign In
        </Link>
      </div>
    </header>
  );
};
