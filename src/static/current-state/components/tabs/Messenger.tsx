import * as React from 'react';

export type MessengerProps = {
  currentMessageState: IMessageState;
};

type MessengerState = {
  message: string;
  type: string;
};

export class Messenger extends React.Component<MessengerProps, MessengerState> {
  messageColours = {
    default: 'transparent',
    warning: 'orange',
    error: 'red',
  };

  messageEmoji = {
    default: '📢',
    warning: '⚠️',
    error: '❌',
  };

  state: MessengerState = {
    message: '',
    type: 'default',
  };

  sendMessage = () => {
    const { message, type } = this.state;
    if (!message) return;
    fetch('/api/message', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ message, type }),
    }).then(() => location.reload());
  };

  removeMessage = () => {
    fetch('/api/remove-message', { method: 'POST' }).then(() => location.reload());
  };

  render() {
    const {
      currentMessageState: { messageExists, message, messageType },
    } = this.props;
    const msgType = messageType || 'default';
    return (
      <ak-grid style={{ marginLeft: '-15px' }}>
        <ak-grid-column size={6}>
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
            <select
              className="ak-field-select"
              style={{
                width: '100px',
                marginTop: '10px',
                paddingTop: '5px',
                paddingBottom: '6px',
              }}
              id="messageType"
              name="messageType"
              defaultValue="default"
              onChange={({ currentTarget: { value } }) => this.setState({ type: value })}
            >
              <option>default</option>
              <option>warning</option>
              <option>error</option>
            </select>
            <button
              className="ak-button ak-button__appearance-default"
              style={{
                width: '120px',
                marginLeft: '10px',
              }}
              onClick={this.sendMessage}
            >
              Send Message
            </button>
          </div>
        </ak-grid-column>
        {messageExists ? (
          <ak-grid-column size={5}>
            <h4 style={{ marginTop: '20px' }}>Current Banner Message:</h4>
            <div
              style={{
                width: 'fit-content',
                border: `2px solid ${this.messageColours[msgType]}`,
                borderRadius: '5px',
                padding: '6px',
                marginTop: '5px',
                fontWeight: msgType === 'default' ? 'bold' : 'normal',
              }}
            >
              {`${this.messageEmoji[msgType]} ${message} ${this.messageEmoji[msgType]}`}
            </div>
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
