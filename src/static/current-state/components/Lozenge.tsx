import * as React from 'react';
import { css } from 'emotion';

import { LozengeAppearance } from './types';

let styles = css({
  boxSizing: 'border-box',
  display: 'inline-block',
  fontSize: '11px',
  fontWeight: 700,
  lineHeight: '1',
  maxWidth: '180px',
  textTransform: 'uppercase',
  verticalAlign: 'baseline',
  whiteSpace: 'nowrap',
  borderRadius: '3px',
  padding: '2px 4px 3px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

let appearance = {
  default: {
    backgroundColor: 'var(--n20-color)',
    color: 'var(--n500-color)',
  },
  success: {
    backgroundColor: 'var(--g50-color)',
    color: 'var(--g500-color)',
  },
  removed: {
    backgroundColor: 'var(--r50-color)',
    color: 'var(--r500-color)',
  },
  moved: {
    backgroundColor: 'var(--y50-color)',
    color: 'var(--n600-color)',
  },
  new: {
    backgroundColor: 'var(--p50-color)',
    color: 'var(--p500-color)',
  },
  inprogress: {
    backgroundColor: 'var(--b50-color)',
    color: 'var(--b500-color)',
  },
};

export type Props = {
  appearance?: LozengeAppearance;
  title?: string;
};

export const Lozenge: React.FunctionComponent<Props> = props => {
  let selectedApperance = props.appearance ? appearance[props.appearance] : appearance.default;

  return (
    <span className={styles} style={selectedApperance} title={props.title}>
      {props.children}
    </span>
  );
};
