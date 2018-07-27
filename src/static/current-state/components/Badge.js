// @flow

import React from 'react';
import type { Node } from 'react';
import { css } from 'emotion';

let styles = css({
  display: 'inline-block',
  fontSize: '12px',
  fontWeight: 'normal',
  lineHeight: 1,
  minWidth: '1px',
  textAlign: 'center',
  borderRadius: '2em',
  padding: '0.166667em 0.5em'
});

let appearance = {
  default: {
    backgroundColor: 'var(--n30-color)',
    color: 'var(--n800-color)'
  },
  primary: {
    backgroundColor: 'var(--b400-color)',
    color: 'var(--n0-color)'
  },
  important: {
    backgroundColor: 'var(--r300-color)',
    color: 'var(--n0-color)'
  },
  added: {
    backgroundColor: 'var(--g50-color)',
    color: 'var(--g500-color)'
  }
};

export function Badge(props: {
  appearance?: $Keys<typeof appearance>,
  children: Node
}) {
  let selectedAppearance = props.appearance
    ? appearance[props.appearance]
    : appearance.default;
  return (
    <span className={styles} style={selectedAppearance}>
      {props.children}
    </span>
  );
}
