import * as React from 'react';
import { css } from 'emotion';

let styles = css({
  background: 'var(--y50-color)',
  borderRadius: '3px',
  margin: '4px 0px',
  padding: '8px',
});

export const Panel: React.FunctionComponent = ({ children }) => <div className={styles}>{children}</div>;
