// @flow

import React from 'react';
import { css } from 'emotion';
import type { RunnerState } from '../../../types';
import { Section } from './Section';
import { Logo } from './Logo';
import { WithAPIData } from './WithAPIData';
import { CurrentState } from './CurrentState';
import { LastBuild } from './LastBuild';
import { Tabs } from './Tabs';

export function App() {
  return (
    <div>
      <Logo />
      <WithAPIData
        poll={true}
        endpoint="current-state"
        renderLoading={() => <Section>Loading...</Section>}
        render={(data: RunnerState) => (
          <div>
            <CurrentState
              started={data.started}
              locked={data.locked}
              paused={data.paused}
              pausedReason={data.pausedReason}
              queueSize={data.queue.length}
              isRunning={!!data.running.buildId}
            />

            <LastBuild historyItem={data.history[0]} />

            <Tabs
              selected={1}
              allowedUsers={data.usersAllowedToMerge}
              running={data.running}
              queue={data.queue}
              history={data.history}
            />
          </div>
        )}
      />
    </div>
  );
}
