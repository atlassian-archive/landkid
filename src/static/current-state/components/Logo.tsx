import * as React from 'react';
import { css } from 'emotion';

let styles = css({
  textTransform: 'uppercase',
  fontWeight: 400,
  '& .logo__secondary': {
    color: 'var(--secondary-text-color)',
  },
  flex: 1,
});

export const Logo: React.FunctionComponent = () => (
  <h1 className={styles}>
    Landkid <span className="logo__secondary">Status</span>
  </h1>
);
