import { css } from 'emotion';

const listStyles = css({
  '&, & ul': {
    paddingLeft: '20px',
    '&:first-child': {
      marginTop: '5px',
    },
  },
});

export default listStyles;
