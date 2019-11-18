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
    }).then(() => location.reload());
  };

  removeMessage = () => {
    fetch('/api/remove-message', { method: 'POST' }).then(() => location.reload());
  };

  render() {
    const {
      currentMessageState: { messageExists, message },
    } = this.props;
    return (
      <ak-grid style={{ marginLeft: '-15px' }}>
        <ak-grid-column size="6">
          <div className="ak-field-group" style={{ width: '400px' }}>
            <h4 style={{ marginBottom: '5px' }}>
              Banner Message to be displayed on Pull Requests:
            </h4>
            <textarea
              className="ak-field-textarea"
              rows={5}
              id="message"
              name="message"
              onChange={({ currentTarget: { value } }) => this.setState({ message: value })}
            />
            <button
              className="ak-button ak-button__appearance-default"
              style={{ marginTop: '10px' }}
              onClick={this.sendMessage}
            >
              Send Message
            </button>
          </div>
        </ak-grid-column>
        {messageExists ? (
          <ak-grid-column size="5">
            <h4 style={{ marginTop: '20px' }}>Current Banner Message:</h4>
            <p>{message}</p>
            <button
              className="ak-button ak-button__appearance-default"
              style={{ marginTop: '10px' }}
              onClick={this.removeMessage}
            >
              Remove Message
            </button>
          </ak-grid-column>
        ) : null}
      </ak-grid>
    );
  }
}
