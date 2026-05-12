import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import type React from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AppNavbar } from '../components/NavBar';
import { WhiteBoxLogo } from '../components/WhiteBoxLogo';
import { ApiError, authApi } from '../lib/api';
import {
  createEncryptedEcdhKeys,
  decryptPrivateKey,
  importPrivateEcdhKey,
} from '../lib/crypto-api';
import { usePageMeta } from '../lib/page-meta';
import {
  setEncryptedPrivateKeyMetadata,
  setPrivateKey,
  setUser,
} from '../lib/session';

export const SignUpPage = () => {
  usePageMeta({
    title: 'Convo | Create Account',
    description:
      'Create a Convo account to start secure end-to-end encrypted private messaging.',
  });

  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const cryptoBundle = await createEncryptedEcdhKeys(password);
      const response = await authApi.signUp({
        email,
        password,
        ...cryptoBundle,
      });

      const pkcs8 = await decryptPrivateKey(password, response.user);
      const privateKey = await importPrivateEcdhKey(pkcs8);

      setUser({
        id: response.user.id,
        email: response.user.email,
        publicKey: response.user.publicKey,
        createdAt: response.user.createdAt,
      });
      setEncryptedPrivateKeyMetadata({
        encryptedPrivateKey: response.user.encryptedPrivateKey,
        privateKeyIv: response.user.privateKeyIv,
        privateKeySalt: response.user.privateKeySalt,
        privateKeyKdfIterations: response.user.privateKeyKdfIterations,
      });
      setPrivateKey(privateKey);

      navigate('/chat');
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        if (requestError.status === 409) {
          setError('That email is already registered. Try signing in instead.');
        } else if (requestError.status === 400) {
          setError(
            requestError.message || 'Please check your details and try again.',
          );
        } else if (requestError.status < 500) {
          setError(requestError.message || 'Unable to create account.');
        } else {
          setError('Application error. Please try again later.');
        }
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
            <h1>Create your account</h1>
            <p>Start your private chat today</p>
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
              Password
              <span className="auth-form__password-wrapper">
                <input
                  autoComplete="new-password"
                  minLength={8}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
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

            <label>
              Confirm password
              <span className="auth-form__password-wrapper">
                <input
                  autoComplete="new-password"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="*******"
                  required
                  type={isPasswordVisible ? 'text' : 'password'}
                  value={confirmPassword}
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
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="auth-panel__switch">
            Already have an account? <Link to="/signin">Sign in</Link>
          </p>
          <p className="auth-panel__terms">
            By signing up you agree to our <a href="#">Terms</a> and{' '}
            <a href="#">Privacy Policy</a>
          </p>
        </div>
      </section>
    </main>
  );
};
