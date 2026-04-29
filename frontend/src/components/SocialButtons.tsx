const GoogleIcon = () => (
  <svg aria-hidden="true" className="social-icon" viewBox="0 0 24 24">
    <path
      d="M21.8 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.5a4.8 4.8 0 0 1-2 3.1v2.6h3.2c1.9-1.8 3-4.4 3-7.7Z"
      fill="#4285F4"
    />
    <path
      d="M12 22c2.7 0 5-1 6.7-2.8l-3.2-2.5c-.9.6-2 .9-3.5.9-2.6 0-4.8-1.8-5.5-4.2H3.3V16c1.7 3.4 5.1 6 8.7 6Z"
      fill="#34A853"
    />
    <path
      d="M6.5 13.4c-.2-.6-.3-1.1-.3-1.7s.1-1.2.3-1.7V7.3H3.3A10 10 0 0 0 2.2 12c0 1.6.4 3 1.1 4.3l3.2-2.9Z"
      fill="#FBBC04"
    />
    <path
      d="M12 6.2c1.5 0 2.8.5 3.8 1.4l2.8-2.8A9.6 9.6 0 0 0 12 2c-3.6 0-7 2.6-8.7 6l3.2 2.6c.7-2.4 2.9-4.4 5.5-4.4Z"
      fill="#EA4335"
    />
  </svg>
);

const GitHubIcon = () => (
  <svg
    aria-hidden="true"
    className="social-icon"
    fill="currentColor"
    viewBox="0 0 24 24"
  >
    <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5V19c-2.8.6-3.4-1.2-3.4-1.2-.4-1-1-1.3-1-1.3-.9-.6.1-.6.1-.6 1 .1 1.6 1 1.6 1 .9 1.6 2.4 1.1 3 1 .1-.7.4-1.1.6-1.3-2.2-.2-4.6-1.1-4.6-5a4 4 0 0 1 1-2.8c-.1-.3-.4-1.3.1-2.7 0 0 .8-.2 2.8 1a9.7 9.7 0 0 1 5 0c2-1.2 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7a4 4 0 0 1 1 2.8c0 3.9-2.4 4.8-4.7 5 .4.3.6.9.6 1.8V21c0 .3.2.6.7.5A10 10 0 0 0 12 2Z" />
  </svg>
);

type SocialButtonsProps = {
  mode: 'signin' | 'signup';
};

export const SocialButtons = ({ mode }: SocialButtonsProps) => {
  return (
    <div className="auth-social">
      <button type="button" className="auth-social__button">
        <GoogleIcon />
        Google
      </button>
      <button type="button" className="auth-social__button">
        <GitHubIcon />
        GitHub
      </button>
      <div className="auth-divider">
        <span>
          {mode === 'signin'
            ? 'or continue with email'
            : 'or sign up with email'}
        </span>
      </div>
    </div>
  );
};
