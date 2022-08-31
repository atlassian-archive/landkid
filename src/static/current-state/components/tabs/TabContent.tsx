import React from 'react';
import { css } from 'emotion';

let tabStyles = css({
  marginTop: '27px',
  position: 'relative',
  borderTop: '1px solid var(--n20-color)',

  '&:before': {
    position: 'absolute',
    display: 'block',
    content: '""',
    width: '1px',
    height: '27px',
    background: 'var(--n20-color)',
    top: '-27px',
    left: '50%',
    marginLeft: '-1px',
  },
});

export const TabContent: React.FunctionComponent = (props) => {
  const { children } = props;
  return <div className={tabStyles}>{children}</div>;
};
