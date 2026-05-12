import { useState } from 'react';

import {
  decryptPrivateKey,
  importPrivateEcdhKey,
} from '../lib/crypto-api';
import {
  getEncryptedPrivateKeyMetadata,
  setPrivateKey,
} from '../lib/session';

type UnlockPromptProps = {
  onUnlocked: () => void;
};

export const UnlockPrompt = ({ onUnlocked }: UnlockPromptProps) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const metadata = getEncryptedPrivateKeyMetadata();
    if (!metadata) {
      setError('Session data missing. Please sign in again.');
      return;
    }

    setIsUnlocking(true);
    try {
      const pkcs8 = await decryptPrivateKey(password, metadata);
      const privateKey = await importPrivateEcdhKey(pkcs8);
      setPrivateKey(privateKey);
      setPassword('');
      onUnlocked();
    } catch {
      setError('Incorrect password. Try again.');
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <form className="unlock-prompt" onSubmit={handleSubmit}>
      <h2 className="unlock-prompt__title">Unlock your private key</h2>
      <p className="unlock-prompt__text">
        Your private key isn&apos;t in memory anymore (probably the page was
        reloaded). Re-enter your password so we can decrypt it locally — it
        never leaves your browser.
      </p>
      <label className="unlock-prompt__field">
        <span>Password</span>
        <input
          autoComplete="current-password"
          autoFocus
          onChange={(event) => setPassword(event.target.value)}
          placeholder="*******"
          required
          type="password"
          value={password}
        />
      </label>
      {error ? <p className="unlock-prompt__error">{error}</p> : null}
      <button
        className="unlock-prompt__submit"
        disabled={isUnlocking || password.length === 0}
        type="submit"
      >
        {isUnlocking ? 'Unlocking…' : 'Unlock'}
      </button>
    </form>
  );
};
