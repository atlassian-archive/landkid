import * as React from 'react';
import { css } from 'emotion';
import { Section } from './Section';
import { Badge } from './Badge';
import { Panel } from './Panel';
import { RunnerState } from '../../../types';

let styles = css({
  display: 'flex',
  marginBottom: '18px',
  '& .current-state__card': {
    flexGrow: 1,
    boxSizing: 'border-box',
    borderLeft: '1px solid var(--n20-color)',
    padding: '18px',
    textAlign: 'center',

    '&:first-child': {
      borderLeft: 'none',
    },
  },

  '& .current-state__card-title': {
    fontWeight: '400',
    marginBottom: '9px',
  },

  '& .current-state__info': {
    color: 'var(--secondary-text-color)',
  },
});

export type Props = RunnerState;

export function CurrentState(props: Props) {
  // const { started, paused, pausedReason, locked, queueSize, isRunning } = props;
  const { daysSinceLastFailure, queue, pauseState } = props;
  const fancyDaysSinceLastFailure = daysSinceLastFailure === -1 ? '∞' : daysSinceLastFailure;
  function renderStateColumns() {
    return (
      <div className={styles}>
        <div className="current-state__card">
          <h4 className="current-state__card-title">Days Since Last Accident:</h4>
          <div className="current-state__info" title={`${fancyDaysSinceLastFailure}`}>
            {fancyDaysSinceLastFailure} days
          </div>
        </div>
        <div className="current-state__card">
          <h4 className="current-state__card-title">Working:</h4>
          <div className="current-state__info">
            <Badge appearance="added">Yes</Badge>
          </div>
        </div>
        <div className="current-state__card">
          <h4 className="current-state__card-title">Queue Size:</h4>
          <div className="current-state__info">
            <Badge>{queue.length}</Badge>
          </div>
        </div>
      </div>
    );
  }

  function renderPausedPanel() {
    return (
      <Panel>
        <strong>Builds are currently paused</strong>
        <br />
        {pauseState.reason || 'No reason was provided'}
      </Panel>
    );
  }

  return <Section>{pauseState.paused ? renderPausedPanel() : renderStateColumns()}</Section>;
}
