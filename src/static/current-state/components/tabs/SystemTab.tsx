import React from 'react';
import { TabContent } from './TabContent';
import { Messenger } from './Messenger';
import { UsersList } from './UsersList';
import { PriorityBranchList } from './PriorityBranchList';
import { MergeSettings } from '../../../../types';
import Info from '@atlaskit/icon/glyph/info';
import Tooltip from '@atlaskit/tooltip';

export type SystemTabProps = {
  users: UserState[];
  loggedInUser: ISessionUser;
  defaultPaused: boolean;
  bannerMessageState: IMessageState | null;
  maxConcurrentBuilds: number;
  priorityBranchList: IPriorityBranch[];
  adminSettings: IAdminSettings;
  config: { mergeSettings?: MergeSettings; speculationEngineEnabled: boolean };
  refreshData: () => void;
};

export type SystemTabsState = {
  paused: boolean;
  maxConcurrentBuilds: number;
  adminSettings: { mergeBlockingEnabled: boolean; speculationEngineEnabled: boolean };
};

export class SystemTab extends React.Component<SystemTabProps, SystemTabsState> {
  constructor(props: SystemTabProps) {
    super(props);
    this.state = {
      paused: props.defaultPaused,
      maxConcurrentBuilds: props.maxConcurrentBuilds,
      adminSettings: props.adminSettings,
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

  handleMergeBlockingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const mergeBlockingEnabled = e.target.checked;
    const { speculationEngineEnabled } = this.state.adminSettings;

    this.updateAdminSettings(mergeBlockingEnabled, speculationEngineEnabled);
  };

  handleSpeculationEngineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const speculationEngineEnabled = e.target.checked;
    const { mergeBlockingEnabled } = this.state.adminSettings;

    this.updateAdminSettings(mergeBlockingEnabled, speculationEngineEnabled);
  };

  updateAdminSettings = async (
    mergeBlockingEnabled: boolean,
    speculationEngineEnabled: boolean,
  ) => {
    const { refreshData } = this.props;
    const json = await fetch('/api/update-admin-settings', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ mergeBlockingEnabled, speculationEngineEnabled }),
    }).then((response) => response.json());

    if (json.error) {
      console.error(json.error);
      window.alert(json.error);
    } else {
      this.setState({ adminSettings: { mergeBlockingEnabled, speculationEngineEnabled } });
      refreshData();
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
    const { users, loggedInUser, bannerMessageState, refreshData, config } = this.props;
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
              {config.mergeSettings?.mergeBlocking?.enabled && (
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
                  <span>Merge blocking: </span>
                  <Tooltip
                    content="Block merging of PRs based on the configured builds"
                    position="top"
                  >
                    <Info label="info" size="small"></Info>
                  </Tooltip>
                  <input
                    type="checkbox"
                    name="merge-blocking-toggle"
                    id="merge-blocking-toggle"
                    value="merge-blocking-toggle"
                    checked={this.state.adminSettings.mergeBlockingEnabled}
                    onChange={this.handleMergeBlockingChange}
                  />
                  <label htmlFor="merge-blocking-toggle">Merge blocking enabled</label>
                </div>
              )}

              {config.speculationEngineEnabled && (
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
                  <span>Speculation engine: </span>
                  <Tooltip
                    content="Re-order PRs based on their impact before placing them on the running slots"
                    position="top"
                  >
                    <Info label="info" size="small"></Info>
                  </Tooltip>
                  <input
                    type="checkbox"
                    name="speculation-engine-toggle"
                    id="speculation-engine-toggle"
                    value="speculation-engine-toggle"
                    checked={this.state.adminSettings.speculationEngineEnabled}
                    onChange={this.handleSpeculationEngineChange}
                  />
                  <label htmlFor="speculation-engine-toggle">Speculation engine enabled</label>
                </div>
              )}

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
