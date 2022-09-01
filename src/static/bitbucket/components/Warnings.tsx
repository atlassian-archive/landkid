import listStyles from './styles/listStyles';

type WarningProps = {
  warnings: string[];
};

import { css } from 'emotion';
import { N300 } from '@atlaskit/theme/colors';

const subtextStyles = css({
  fontSize: '12px',
  color: N300,
});

const Warnings = ({ warnings }: WarningProps) =>
  warnings.length > 0 ? (
    <>
      <p>
        <b>Warnings</b>:<div className={subtextStyles}>(these will not prevent landing)</div>
      </p>
      <ul className={listStyles}>
        {warnings.map((warning) => (
          <li key={warning} dangerouslySetInnerHTML={{ __html: warning }} />
        ))}
      </ul>
    </>
  ) : null;

export default Warnings;
