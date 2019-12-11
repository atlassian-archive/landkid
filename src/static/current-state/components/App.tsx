import * as React from 'react';
import { RunnerState } from '../../../types';
import { Section } from './Section';
import { WithAPIData } from './WithAPIData';
import { CurrentState } from './CurrentState';
import { RunningBuilds } from './RunningBuilds';
import { Tabs } from './tabs';
import { Header } from './Header';

export const App: React.FunctionComponent = () => (
  <div>
    <WithAPIData<{ loggedIn: boolean; user?: ISessionUser; permission: IPermissionMode }>
      endpoint="auth/whoami"
      renderLoading={() => <Header />}
      render={userInfo => {
        if (userInfo.loggedIn) {
          const loggedInUser = { ...userInfo.user!, permission: userInfo.permission };
          return (
            <React.Fragment>
              <Header user={userInfo.user} />
              <WithAPIData<RunnerState>
                poll={true}
                endpoint="api/current-state"
                renderLoading={() => <Section>Loading...</Section>}
                render={data => (
                  <div>
                    <CurrentState {...data} />
                    <RunningBuilds queue={data.queue} bitbucketBaseUrl={data.bitbucketBaseUrl} />
                    <Tabs
                      bitbucketBaseUrl={data.bitbucketBaseUrl}
                      selected={1}
                      users={data.users}
                      queue={data.queue}
                      loggedInUser={loggedInUser}
                      paused={data.pauseState.paused}
                      bannerMessageState={data.bannerMessageState}
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
