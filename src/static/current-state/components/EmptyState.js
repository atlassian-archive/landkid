// @flow

import React from 'react';
import type { Node } from 'react';
import { css } from 'emotion';

let emptyStyles = css({
  fontSize: '1.42857143em',
  color: 'var(--secondary-text-color)',
  padding: '72px 0 0 0',
  textAlign: 'center'
});

export function EmptyState({ children }: { children: Node }) {
  return <div className={emptyStyles}>{children}</div>;
}
