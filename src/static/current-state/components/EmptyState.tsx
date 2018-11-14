import * as React from 'react';
import { css } from 'emotion';

let emptyStyles = css({
  fontSize: '1.42857143em',
  color: 'var(--secondary-text-color)',
  padding: '72px 0 0 0',
  textAlign: 'center',
});

export const EmptyState: React.FunctionComponent = ({ children }) => (
  <div className={emptyStyles}>{children}</div>
);
