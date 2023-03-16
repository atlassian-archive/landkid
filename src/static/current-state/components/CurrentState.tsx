import React from 'react';
import { Section } from './Section';
import { Panel } from './Panel';
import { RunnerState } from '../../../types';

export type Props = RunnerState;

export const CurrentState: React.FunctionComponent<Props> = (props) => {
  const { pauseState } = props;

  const renderPausedPanel = () => (
    <Panel>
      <strong>Builds are currently paused</strong>
      <br />
      {pauseState ? pauseState.reason || 'No reason was provided' : null}
    </Panel>
  );

  return <Section>{pauseState ? renderPausedPanel() : ''}</Section>;
};
