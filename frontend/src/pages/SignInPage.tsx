import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import type React from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AppNavbar } from '../components/NavBar';
import { WhiteBoxLogo } from '../components/WhiteBoxLogo';
import { ApiError, authApi } from '../lib/api';
import {
  decryptPrivateKey,
  importPrivateEcdhKey,
} from '../lib/crypto-api';
import { usePageMeta } from '../lib/page-meta';
import { setPrivateKey, setUser } from '../lib/session';

export const SignInPage = () => {
  usePageMeta({
    title: 'Convo | Sign In',
    description:
      'Sign in to Convo and continue your secure private conversations.',
  });

  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await authApi.signIn({ email, password });

      const pkcs8 = await decryptPrivateKey(password, response.user);
      const privateKey = await importPrivateEcdhKey(pkcs8);

      setUser({
        id: response.user.id,
        email: response.user.email,
        publicKey: response.user.publicKey,
        createdAt: response.user.createdAt,
      });
      setPrivateKey(privateKey);

      navigate('/contacts');
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status < 500) {
        setError('Invalid email or password');
      } else if (
        requestError instanceof DOMException ||
        (requestError instanceof Error &&
          requestError.name === 'OperationError')
      ) {
        setError('Unable to unlock your private key. Please try again.');
      } else {
        setError('Application error. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="page-shell auth-page">
      <AppNavbar />

      <section className="auth-layout">
        <div className="auth-panel">
          <WhiteBoxLogo className="auth-panel__logo" />

          <header className="auth-panel__header">
            <h1>Welcome back!</h1>
            <p>Sign in to your account</p>
          </header>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Email
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="your.email@example.com"
                required
                type="email"
                value={email}
              />
            </label>

            <label>
              <span className="auth-form__label-row">
                Password
                <a href="#">Forgot password?</a>
              </span>
              <span className="auth-form__password-wrapper">
                <input
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="*******"
                  required
                  type={isPasswordVisible ? 'text' : 'password'}
                  value={password}
                />
                <button
                  aria-label={
                    isPasswordVisible ? 'Hide password' : 'Show password'
                  }
                  className="auth-form__password-toggle"
                  onClick={() => setIsPasswordVisible((value) => !value)}
                  type="button"
                >
                  {isPasswordVisible ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </span>
            </label>

            {error ? <p className="auth-form__error">{error}</p> : null}

            <button
              className="auth-form__submit"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="auth-panel__switch">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
          <p className="auth-panel__terms">
            By signing in you agree to our <a href="#">Terms</a> and{' '}
            <a href="#">Privacy Policy</a>
          </p>
        </div>
      </section>
    </main>
  );
};
