// @flow

import React from 'react';
import type { Node } from 'react';
import { css } from 'emotion';

let styles = css({
  boxSizing: 'border-box',
  display: 'inline-flex',
  fontSize: '11px',
  fontWeight: '700',
  lineHeight: '1',
  maxWidth: '200px',
  textTransform: 'uppercase',
  verticalAlign: 'baseline',
  whiteSpace: 'nowrap',
  borderRadius: '3px',
  padding: '2px 4px 3px'
});

let appearance = {
  default: {
    backgroundColor: 'var(--n20-color)',
    color: 'var(--n500-color)'
  },
  success: {
    backgroundColor: 'var(--g50-color)',
    color: 'var(--g500-color)'
  },
  removed: {
    backgroundColor: 'var(--r50-color)',
    color: 'var(--r500-color)'
  },
  moved: {
    backgroundColor: 'var(--y50-color)',
    color: 'var(--n600-color)'
  },
  new: {
    backgroundColor: 'var(--p50-color)',
    color: 'var(--p500-color)'
  },
  inprogress: {
    backgroundColor: 'var(--b50-color)',
    color: 'var(--b500-color)'
  }
};

export function Lozenge(props: {
  appearance?: $Keys<typeof appearance>,
  children: Node
}) {
  let selectedApperance = props.appearance
    ? appearance[props.appearance]
    : appearance.default;

  return (
    <span className={styles} style={selectedApperance}>
      {props.children}
    </span>
  );
}
