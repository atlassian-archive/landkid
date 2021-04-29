import * as React from 'react';
import { Logo } from './Logo';
import { css } from 'emotion';

const headerStyles = css({
  display: 'flex',
  alignItems: 'center',
});

const userInfoStyles = css({
  display: 'flex',
  alignItems: 'center',
  padding: 8,
  borderRadius: 6,
  '&:hover': {
    background: 'var(--n20-color)',
  },
});

const userNameStyles = css({
  fontWeight: 'bold',
});

interface HeaderProps {
  user?: ISessionUser;
}

export const Header: React.FunctionComponent<HeaderProps> = ({ user }) => (
  <div className={headerStyles}>
    <Logo />
    {user ? (
      <div className={userInfoStyles}>
        <span className={userNameStyles}>{user.displayName}</span>
      </div>
    ) : null}
  </div>
);
