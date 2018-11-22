import * as React from 'react';
import { RunnerState } from '../../../types';
import { Section } from './Section';
import { WithAPIData } from './WithAPIData';
import { CurrentState } from './CurrentState';
import { RunningBuild } from './RunningBuild';
import { Tabs } from './Tabs';
import { Header } from './Header';

export function App() {
  return (
    <div>
      <WithAPIData
        endpoint="auth/whoami"
        renderLoading={() => <Header />}
        render={(userInfo: { loggedIn: boolean; user?: ISessionUser }) => {
          if (userInfo.loggedIn) {
            return (
              <React.Fragment>
                <Header user={userInfo.user} />
                <WithAPIData
                  poll={true}
                  endpoint="api/current-state"
                  renderLoading={() => <Section>Loading...</Section>}
                  render={(data: RunnerState) => (
                    <div>
                      <CurrentState {...data} />

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
              </React.Fragment>
            );
          }

          window.location.href = '/auth';

          return <p>Signing In...</p>;
        }}
      />
    </div>
  );
}
