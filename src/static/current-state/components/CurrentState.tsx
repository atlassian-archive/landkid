import * as React from 'react';
import { css } from 'emotion';
import * as distanceInWords from 'date-fns/distance_in_words_to_now';
import { Section } from './Section';
import { Badge } from './Badge';
import { Panel } from './Panel';

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

export type Props = {
  started: string;
  paused: boolean;
  pausedReason?: string | null;
  locked: boolean;
  queueSize: number;
  isRunning: boolean;
};

export function CurrentState(props: Props) {
  const { started, paused, pausedReason, locked, queueSize, isRunning } = props;
  function renderColumns() {
    return (
      <div className={styles}>
        <div className="current-state__card">
          <h4 className="current-state__card-title">Uptime:</h4>
          <div
            className="current-state__info"
            title={`Started: ${String(new Date(started))}`}
          >
            {distanceInWords(started)}
          </div>
        </div>
        <div className="current-state__card">
          <h4 className="current-state__card-title">Locked:</h4>
          <div className="current-state__info">
            <Badge appearance={locked ? 'important' : 'added'}>
              {JSON.stringify(locked)}
            </Badge>
          </div>
        </div>
        <div className="current-state__card">
          <h4 className="current-state__card-title">Queue Size:</h4>
          <div className="current-state__info">
            <Badge>{queueSize + (isRunning ? 1 : 0)}</Badge>
          </div>
        </div>
      </div>
    );
  }

  function renderPanel() {
    return (
      <Panel>
        <strong>Builds are currently paused</strong>
        <br />
        {pausedReason}
      </Panel>
    );
  }

  return <Section>{paused ? renderPanel() : renderColumns()}</Section>;
}
