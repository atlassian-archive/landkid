import React from 'react';
import { RunnerState } from '../../../types';
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
      render={(userInfo) => {
        if (userInfo.loggedIn) {
          const loggedInUser = { ...userInfo.user!, permission: userInfo.permission };
          return (
            <React.Fragment>
              <Header user={userInfo.user} />
              <WithAPIData<RunnerState>
                poll={true}
                endpoint="api/current-state"
                render={(data, refresh) => (
                  <div>
                    <CurrentState {...data} />
                    <RunningBuilds
                      queue={data.queue}
                      bitbucketBaseUrl={data.bitbucketBaseUrl}
                      refreshData={refresh}
                    />
                    <Tabs
                      bitbucketBaseUrl={data.bitbucketBaseUrl}
                      selected={1}
                      users={data.users}
                      queue={data.queue}
                      loggedInUser={loggedInUser}
                      paused={data.pauseState !== null}
                      bannerMessageState={data.bannerMessageState}
                      maxConcurrentBuilds={data.maxConcurrentBuilds}
                      permissionsMessage={data.permissionsMessage}
                      refreshData={refresh}
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
