import * as React from 'react';
import { TabContent } from './TabContent';
import { Messenger } from './Messenger';
import { AllowedUsers } from './AllowedUsers';

const Button = (props: { onClick: () => void; error: string; children: React.ReactChild }) => (
  <div style={{ marginTop: '10px' }}>
    <button className="ak-button ak-button__appearance-default" onClick={props.onClick}>
      {props.children}
    </button>
    {props.error && <span style={{ color: 'red', marginLeft: '5px' }}>&larr; {props.error}</span>}
  </div>
);

export type SystemTabProps = {
  allowedUsers: IPermission[];
  loggedInUser: ISessionUser;
  defaultPaused: boolean;
  currentMessageState: IMessageState;
};

export type SystemTabsState = {
  paused: boolean;
  nextError: string;
  cancelError: string;
};

export class SystemTab extends React.Component<SystemTabProps, SystemTabsState> {
  constructor(props: SystemTabProps) {
    super(props);
    this.state = {
      paused: props.defaultPaused,
      nextError: '',
      cancelError: '',
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
        location.reload();
      });
    } else {
      fetch('/api/unpause', { method: 'POST' }).then(() => {
        this.setState({ paused: false });
        location.reload();
      });
    }
  };

  onNextClick = () => {
    fetch('/api/next', { method: 'POST' })
      .then(response => response.json())
      .then(json => {
        if (json.error) {
          console.error(json.error);
          this.setState({ nextError: json.error });
        } else {
          location.reload();
        }
      });
  };

  onCancelClick = () => {
    fetch('/api/cancel-current', { method: 'POST' })
      .then(response => response.json())
      .then(json => {
        if (json.error) {
          console.error(json.error);
          this.setState({ cancelError: json.error });
        } else {
          location.reload();
        }
      });
  };

  render() {
    const { allowedUsers, loggedInUser, currentMessageState } = this.props;
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
                  onChange={this.onPauseChange}
                />
                <label htmlFor="pause-toggle">Option</label>
              </div>
              <Button onClick={this.onNextClick} error={this.state.nextError}>
                Next Build
              </Button>
              <Button onClick={this.onCancelClick} error={this.state.cancelError}>
                Cancel Current Build
              </Button>
              <Messenger currentMessageState={currentMessageState} />
            </React.Fragment>
          )}
          <AllowedUsers users={allowedUsers} loggedInUser={loggedInUser} />
          {loggedInUser.permission === 'read' && (
            <p>To get land access, you will need to ping one of the admins above</p>
          )}
        </div>
      </TabContent>
    );
  }
}
