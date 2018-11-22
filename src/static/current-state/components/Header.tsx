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
  marginRight: 8,
  fontWeight: 'bold',
});

const userImgStyles = css({
  height: 32,
  width: 32,
  borderRadius: '100%',
});

interface HeaderProps {
  user?: ISessionUser;
}

export function Header({ user }: HeaderProps) {
  return (
    <div className={headerStyles}>
      <Logo />
      {user ? (
        <div className={userInfoStyles}>
          <span className={userNameStyles}>{user.displayName}</span>
          <img
            src={`https://bitbucket.org/account/${user.username}/avatar/`}
            className={userImgStyles}
          />
        </div>
      ) : null}
    </div>
  );
}
