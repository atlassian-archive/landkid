// @flow

import React from 'react';
import type { Node } from 'react';
import { css } from 'emotion';

let styles = css({
  marginTop: '45px'
});

let importantStyles = css({
  marginTop: '81px'
});

export function Section({
  children,
  important,
  last
}: {
  children: Node,
  important?: boolean,
  last?: boolean
}) {
  return (
    <div
      className={important ? importantStyles : styles}
      style={{ paddingBottom: last ? '45px' : 0 }}
    >
      {children}
    </div>
  );
}
