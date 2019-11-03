import * as React from 'react';
import { TabContent } from './TabContent';
import { User } from '../User';
import { PermissionControl } from '../PermissionControl';

// sort by permssion descending (admin -> land -> read)
function sortUsersByPermission(user1: IPermission, user2: IPermission) {
  const permssionsLevels = ['read', 'land', 'admin'];
  return permssionsLevels.indexOf(user2.mode) - permssionsLevels.indexOf(user1.mode);
}

export type SystemTabProps = {
  allowedUsers: IPermission[];
  loggedInUser: ISessionUser;
  defaultPaused: boolean;
};

export type SystemTabsState = {
  paused: boolean;
};

export class SystemTab extends React.Component<SystemTabProps, SystemTabsState> {
  constructor(props: SystemTabProps) {
    super(props);
    this.state = {
      paused: props.defaultPaused,
    };
  }

  onPauseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (checked) {
      const reason = window.prompt(
        'What would you like the pause message to be?',
        'Builds have been paused by an admin, see the Fabric Build room for details',
      );
      if (reason === null) return;
      fetch('/api/pause', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ reason }),
      }).then(() => {
        this.setState({ paused: true });
      });
    } else {
      fetch('/api/unpause', { method: 'POST' }).then(() => {
        this.setState({ paused: false });
      });
    }
  };

  onNextClick = () => {
    fetch('/api/next', { method: 'POST' })
      .then(r => r.json())
      .then(console.log);
  };

  onCancelClick = () => {
    fetch('/api/cancel-current', { method: 'POST' })
      .then(r => r.json())
      .then(console.log);
  };

  render() {
    const { allowedUsers, loggedInUser } = this.props;
    return (
      <TabContent>
        <div style={{ marginTop: '27px' }}>
          {loggedInUser.permission === 'admin' && (
            <React.Fragment>
              <h3>Admin Controls</h3>
              <div
                className={`ak-field-toggle ak-field-toggle__size-large`}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  fontSize: '14px',
                  marginTop: '10px',
                }}
              >
                <span>{this.state.paused ? 'Unpause' : 'Pause'} Builds: </span>
                <input
                  type="checkbox"
                  name="pause-toggle"
                  id="pause-toggle"
                  value="pause-toggle"
                  checked={this.state.paused}
                  onChange={this.onPauseChange}
                />
                <label htmlFor="pause-toggle">Option</label>
              </div>
              <div style={{ marginTop: '10px' }}>
                <button
                  className={`ak-button ak-button__appearance-default`}
                  onClick={this.onNextClick}
                >
                  Next Build
                </button>
              </div>
              <div style={{ marginTop: '10px' }}>
                <button
                  className={`ak-button ak-button__appearance-default`}
                  onClick={this.onCancelClick}
                >
                  Cancel Current Build
                </button>
              </div>
            </React.Fragment>
          )}
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
          {loggedInUser.permission === 'read' && (
            <p>To get land access, you will need to ping one of the admins above</p>
          )}
        </div>
      </TabContent>
    );
  }
}
