import { Link } from 'react-router-dom';

type WhiteBoxLogoProps = {
  className?: string;
};

export const WhiteBoxLogo = ({ className }: WhiteBoxLogoProps) => {
  return (
    <Link className={`whitebox-logo ${className ?? ''}`.trim()} to="/">
      <svg
        aria-hidden="true"
        className="whitebox-logo__icon"
        viewBox="0 0 40 40"
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M29.5 11.2A11.5 11.5 0 1 0 29.5 28" strokeWidth="4.1" />
          <path d="M29.4 28.2h-7.8l-6.3 5.1v-6.2" strokeWidth="3" />
          <path d="M16.2 15.8h9" strokeWidth="2.6" />
          <path d="M16.2 20.3h6.2" strokeWidth="2.6" />
        </g>
      </svg>
      <span className="whitebox-logo__text">Convo</span>
    </Link>
  );
};
