import * as React from 'react';
import { RunnerState } from '../../../types';
import { Section } from './Section';
import { Logo } from './Logo';
import { WithAPIData } from './WithAPIData';
import { CurrentState } from './CurrentState';
import { RunningBuild } from './RunningBuild';
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
              {...data}
            />

            <RunningBuild
              queue={data.queue}
              bitbucketBaseUrl={data.bitbucketBaseUrl}
            />

            <Tabs
              bitbucketBaseUrl={data.bitbucketBaseUrl}
              selected={1}
              allowedUsers={data.usersAllowedToLand}
              queue={data.queue}
            />
          </div>
        )}
      />
    </div>
  );
}
