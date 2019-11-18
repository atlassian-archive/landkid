import * as React from 'react';

type MessengerProps = {
  currentMessageState: IMessageState;
};

type MessengerState = {
  message: string;
};

export class Messenger extends React.Component<MessengerProps, MessengerState> {
  state = {
    message: '',
  };

  sendMessage = () => {
    const { message } = this.state;
    if (!message) return;
    fetch('/api/message', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ message }),
    }).then(console.log);
  };

  removeMessage = () => {
    fetch('/api/remove-message', { method: 'POST' }).then(console.log);
  };

  render() {
    const {
      currentMessageState: { messageExists, message },
    } = this.props;
    return (
      <React.Fragment>
        <div className="ak-field-group" style={{ width: '350px' }}>
          <label htmlFor="message">Banner Message to be displayed on Pull Requests</label>
          <textarea
            className="ak-field-textarea"
            rows={5}
            id="message"
            name="message"
            onChange={({ currentTarget: { value } }) => this.setState({ message: value })}
          />
          {messageExists ? (
            <React.Fragment>
              <p>{message}</p>
              <button
                className="ak-button ak-button__appearance-default"
                style={{ marginTop: '10px' }}
                onClick={this.removeMessage}
              >
                Remove Message
              </button>
            </React.Fragment>
          ) : null}
        </div>
        <button
          className="ak-button ak-button__appearance-default"
          style={{ marginTop: '10px' }}
          onClick={this.sendMessage}
        >
          Send Message
        </button>
      </React.Fragment>
    );
  }
}
