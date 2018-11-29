import * as React from 'react';
import { css } from 'emotion';
import { Section } from './Section';
import { QueueItemsList } from './QueueItemsList';
import { EmptyState } from './EmptyState';
import { User } from './User';
import { HistoryTab } from './HistoryTab';
import { PermissionControl } from './PermissionControl';

let controlsStyles = css({
  border: '1px solid var(--n20-color)',
  borderRadius: '2em',
  width: '408px',
  margin: '0 auto',
  display: 'flex',
  overflow: 'hidden',
  marginTop: '63px',

  '& button': {
    flexGrow: 1,
    fontSize: '1.14285714em',
    border: 'none',
    padding: '12px 0',
    background: 'transparent',
    color: 'var(--secondary-text-color)',
    margin: 0,

    '&.--selected': {
      background: 'var(--n20-color)',
      color: 'var(--n500-color)',
    },

    '&:hover, &.--selected:hover': {
      color: 'var(--n400-color)',
      background: 'rgba(9, 30, 66, 0.08)',
      cursor: 'pointer',
    },

    '&:focus': {
      outline: 'none',
      boxShadow: 'none',
    },

    '& + button': {
      borderLeft: '1px solid var(--n20-color)',
    },
  },
});

export type TabsControlsProps = {
  selected: number;
  selectTab: (tab: number) => void;
};

export function TabsControls(props: TabsControlsProps) {
  const { selected, selectTab } = props;
  return (
    <div className={controlsStyles}>
      <button
        onClick={() => selectTab(0)}
        className={`ak-button__appearance-subtle ${selected === 0 ? '--selected' : ''}`}
      >
        System
      </button>
      <button
        onClick={() => selectTab(1)}
        className={`ak-button__appearance-subtle ${selected === 1 ? '--selected' : ''}`}
      >
        Queue
      </button>
      <button
        onClick={() => selectTab(2)}
        className={`ak-button__appearance-subtle ${selected === 2 ? '--selected' : ''}`}
      >
        History
      </button>
    </div>
  );
}

let tabStyles = css({
  marginTop: '27px',
  position: 'relative',
  borderTop: '1px solid var(--n20-color)',

  '&:before': {
    position: 'absolute',
    display: 'block',
    content: '""',
    width: '1px',
    height: '27px',
    background: 'var(--n20-color)',
    top: '-27px',
    left: '50%',
    marginLeft: '-1px',
  },
});

export type QueueTabProps = {
  queue: IStatusUpdate[];
  bitbucketBaseUrl: string;
};

export const QueueTab: React.FunctionComponent<QueueTabProps> = props => {
  const { bitbucketBaseUrl, queue } = props;
  return (
    <div>
      <QueueItemsList
        bitbucketBaseUrl={bitbucketBaseUrl}
        queue={queue}
        fading
        renderEmpty={() => (
          <Tab>
            <EmptyState>Queue is empty...</EmptyState>
          </Tab>
        )}
      />
    </div>
  );
};

// sort by permssion descending (admin -> land -> read)
function sortUsersByPermission(user1: IPermission, user2: IPermission) {
  const permssionsLevels = ['read', 'land', 'admin'];
  return permssionsLevels.indexOf(user2.mode) - permssionsLevels.indexOf(user1.mode);
}

export type HistoryTabProps = {
  bitbucketBaseUrl: string;
};

export type SystemTabProps = { allowedUsers: IPermission[]; loggedInUser: ISessionUser };
export const SystemTab: React.FunctionComponent<SystemTabProps> = props => {
  const { allowedUsers, loggedInUser } = props;
  console.log(allowedUsers);
  return (
    <Tab>
      <div style={{ marginTop: '27px' }}>
        <h3>Allowed Users</h3>
        <ul>
          {allowedUsers
            .sort(sortUsersByPermission)
            .map(({ aaid, mode, assignedByAaid, dateAssigned }) => (
              <li key={aaid}>
                <User aaid={aaid}>
                  {user => (
                    <div
                      title={`Assigned by ${assignedByAaid} on ${dateAssigned}`}
                      style={{ display: 'flex', flexDirection: 'row' }}
                    >
                      <span style={{ display: 'inline-block', minWidth: '150px' }}>
                        {user.displayName}
                      </span>
                      <PermissionControl
                        user={user}
                        userPermission={mode}
                        loggedInUser={loggedInUser}
                      />
                    </div>
                  )}
                </User>
              </li>
            ))}
        </ul>
      </div>
    </Tab>
  );
};

export const Tab: React.FunctionComponent = props => {
  const { children } = props;
  return <div className={tabStyles}>{children}</div>;
};

export type TabsProps = {
  selected: number;
  allowedUsers: IPermission[];
  queue: IStatusUpdate[];
  bitbucketBaseUrl: string;
  loggedInUser: ISessionUser;
};

export type TabsState = {
  selected: number;
};

export class Tabs extends React.Component<TabsProps, TabsState> {
  state: TabsState = {
    selected: 1,
  };

  private onTabSelected = (selected: number) => this.setState({ selected });

  render() {
    let { selected } = this.state;
    let { allowedUsers, bitbucketBaseUrl, queue, loggedInUser } = this.props;

    return (
      <Section important last>
        <TabsControls selectTab={this.onTabSelected} selected={selected} />
        {selected === 0 ? (
          <SystemTab allowedUsers={allowedUsers} loggedInUser={loggedInUser} />
        ) : null}
        {selected === 1 ? <QueueTab bitbucketBaseUrl={bitbucketBaseUrl} queue={queue} /> : null}
        {selected === 2 ? <HistoryTab bitbucketBaseUrl={bitbucketBaseUrl} /> : null}
      </Section>
    );
  }
}
