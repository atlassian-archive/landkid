import { css } from 'emotion';
import { gridSize } from '@atlaskit/theme/constants';
import { keyframes } from '@emotion/core';

const shimmer = keyframes`
    0% {
        background-position: -300px 0;
    }
    100% {
        background-position: 1000px 0;
    }
`;

const loadingRectangleStyles = css`
  display: inline-block;
  vertical-align: middle;
  position: relative;
  height: 0.8rem;
  margin: ${gridSize()}px 0 ${gridSize()}px;
  width: 100%;
  border-radius: 2px;
  animation-duration: 1.2s;
  animation-fill-mode: forwards;
  animation-iteration-count: infinite;
  animation-name: ${shimmer};
  animation-timing-function: linear;
  background-color: #c9d7ea;
  background-image: linear-gradient(to right, #c9d7ea 10%, #d1dff3 20%, #c9d7ea 30%);
  background-repeat: no-repeat;
`;

export default loadingRectangleStyles;
