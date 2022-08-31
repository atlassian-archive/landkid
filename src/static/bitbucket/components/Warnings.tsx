import listStyles from './styles/listStyles';

type WarningProps = {
  warnings: string[];
};

import styled from 'styled-components';
import { N300 } from '@atlaskit/theme/colors';

const Subtext = styled.div`
  font-size: 12px;
  color: ${N300};
`;

const Warnings = ({ warnings }: WarningProps) =>
  warnings.length > 0 ? (
    <>
      <p>
        <b>Warnings</b>:<Subtext>(these will not prevent landing)</Subtext>
      </p>
      <ul className={listStyles}>
        {warnings.map((warning) => (
          <li key={warning} dangerouslySetInnerHTML={{ __html: warning }} />
        ))}
      </ul>
    </>
  ) : null;

export default Warnings;
