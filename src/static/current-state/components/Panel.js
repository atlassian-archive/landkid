// @flow

import React from 'react';
import type { Node } from 'react';
import { css } from 'emotion';

let styles = css({
  background: 'var(--y50-color)',
  borderRadius: '3px',
  margin: '4px 0px',
  padding: '8px'
});

export function Panel({ children }: { children: Node }) {
  return <div className={styles}>{children}</div>;
}
