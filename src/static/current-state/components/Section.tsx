import * as React from 'react';
import { css } from 'emotion';

let styles = css({
  marginTop: '45px',
});

let importantStyles = css({
  marginTop: '81px',
});

export type Props = {
  important?: boolean;
  last?: boolean;
};

export const Section: React.FunctionComponent<Props> = ({ children, important, last }) => (
  <div
    className={important ? importantStyles : styles}
    style={{ paddingBottom: last ? '45px' : 0 }}
  >
    {children}
  </div>
);
