import React from 'react';
import { TabContent } from './TabContent';
import { Messenger } from './Messenger';
import { UsersList } from './UsersList';
import { PriorityBranchList } from './PriorityBranchList';

export type SystemTabProps = {
  users: UserState[];
  loggedInUser: ISessionUser;
  defaultPaused: boolean;
  bannerMessageState: IMessageState | null;
  maxConcurrentBuilds: number;
  priorityBranchList: IPriorityBranch[];
  refreshData: () => void;
};

export type SystemTabsState = {
  paused: boolean;
  maxConcurrentBuilds: number;
};

export class SystemTab extends React.Component<SystemTabProps, SystemTabsState> {
  constructor(props: SystemTabProps) {
    super(props);
    this.state = {
      paused: props.defaultPaused,
      maxConcurrentBuilds: props.maxConcurrentBuilds,
    };
  }
  handlePauseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { refreshData } = this.props;
    const checked = e.target.checked;
    if (checked) {
      const reason = window.prompt(
        'What would you like the pause message to be?',
        'Builds have been paused by an admin, see #atlassian-frontend for details',
      );
      if (reason === null) return;
      fetch('/api/pause', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ reason }),
      }).then(() => {
        this.setState({ paused: true });
        refreshData();
      });
    } else {
      fetch('/api/unpause', { method: 'POST' }).then(() => {
        this.setState({ paused: false });
        refreshData();
      });
    }
  };

  handleNextClick = () => {
    const { refreshData } = this.props;
    fetch('/api/next', { method: 'POST' })
      .then((response) => response.json())
      .then((json) => {
        if (json.error) {
          console.error(json.error);
          window.alert(json.error);
        } else {
          refreshData();
        }
      });
  };

  handleUpdateConcurrentBuilds = () => {
    const { refreshData } = this.props;
    const { maxConcurrentBuilds } = this.state;

    fetch('/api/update-concurrent-builds', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ maxConcurrentBuilds }),
    })
      .then((response) => response.json())
      .then((json) => {
        if (json.error) {
          console.error(json.error);
          window.alert(json.error);
        } else {
          refreshData();
        }
      });
  };

  render() {
    const { users, loggedInUser, bannerMessageState, refreshData } = this.props;
    return (
      <TabContent>
        <div style={{ marginTop: '27px' }}>
          {loggedInUser.permission === 'admin' && (
            <React.Fragment>
              <h3>Admin Controls</h3>
              <div
                className="ak-field-toggle ak-field-toggle__size-large"
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
                  onChange={this.handlePauseChange}
                />
                <label htmlFor="pause-toggle">Option</label>
              </div>
              <div style={{ marginTop: '10px' }}>
                <button
                  className="ak-button ak-button__appearance-default"
                  onClick={this.handleNextClick}
                >
                  Next Build
                </button>
              </div>
              <div style={{ marginTop: '10px' }}>
                <select
                  className="ak-field-select"
                  style={{
                    width: '100px',
                    marginTop: '10px',
                    paddingTop: '5px',
                    paddingBottom: '6px',
                  }}
                  id="concurrentBuilds"
                  name="concurrentBuilds"
                  defaultValue={this.state.maxConcurrentBuilds}
                  onChange={({ currentTarget: { value } }) =>
                    this.setState({ maxConcurrentBuilds: +value })
                  }
                  data-test-id="update-concurrent-builds-select"
                >
                  <option>1</option>
                  <option>2</option>
                  <option>3</option>
                  <option>4</option>
                </select>
                <button
                  className="ak-button ak-button__appearance-default"
                  style={{
                    marginLeft: '10px',
                  }}
                  onClick={this.handleUpdateConcurrentBuilds}
                  data-test-id="update-concurrent-builds-btn"
                >
                  Update Concurrent Builds
                </button>
              </div>
              <Messenger bannerMessageState={bannerMessageState} refreshData={refreshData} />
              <PriorityBranchList
                priorityBranchList={this.props.priorityBranchList}
                refreshData={refreshData}
              ></PriorityBranchList>
            </React.Fragment>
          )}
          <UsersList users={users} loggedInUser={loggedInUser} />
          {loggedInUser.permission === 'read' && (
            <p>To get land access, you will need to ping one of the admins above</p>
          )}
        </div>
      </TabContent>
    );
  }
}
