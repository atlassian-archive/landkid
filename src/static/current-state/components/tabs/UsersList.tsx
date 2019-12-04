import * as React from 'react';
import { css } from 'emotion';
import { User } from '../User';
import { PermissionControl } from '../PermissionControl';

const noteButton = css({
  marginLeft: '5px',
  background: 'none',
  border: 'none',
  padding: '0px',
  verticalAlign: 'middle',
  color: 'darkgray',
  ':focus': { outline: 'none' },
  ':hover': {
    cursor: 'pointer',
    color: 'black',
  },
});

const noteSpan = css({
  marginLeft: '5px',
  marginBottom: '1px',
  color: 'darkgray',
  fontStyle: 'italic',
  verticalAlign: 'middle',
});

const icon = css({
  height: '15px',
  width: '15px',
});

type NoteManagerProps = {
  aaid: string;
  note?: string;
};

type NoteManagerState = {
  note?: string;
};

class NoteManager extends React.Component<NoteManagerProps, NoteManagerState> {
  state = {
    note: this.props.note,
  };

  addNote = () => {
    const note = window.prompt('What would you like the note to be?', this.state.note);
    if (note === null) return;
    fetch(`/api/note/${this.props.aaid}`, {
      method: 'PATCH',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ note }),
    })
      .then(res => res.json())
      .then(json => {
        if (json.error) {
          console.error(json.error);
          window.alert(json.error);
        } else {
          console.log(json);
          this.setState({ note });
        }
      });
  };

  removeNote = () => {
    fetch(`/api/note/${this.props.aaid}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(json => {
        if (json.error) {
          console.error(json.error);
          window.alert(json.error);
        } else {
          console.log(json);
          this.setState({ note: undefined });
        }
      });
  };

  render() {
    const { note } = this.state;
    if (!note)
      return (
        <button className={noteButton} onClick={this.addNote}>
          <svg focusable="false" className={icon}>
            <use xlinkHref="#ak-icon-add" />
          </svg>
        </button>
      );
    return (
      <React.Fragment>
        <span className={noteSpan}>{note}</span>
        <button className={noteButton} onClick={this.addNote}>
          <svg focusable="false" className={icon}>
            <use xlinkHref="#ak-icon-edit" />
          </svg>
        </button>
        <button className={noteButton} onClick={this.removeNote}>
          <svg focusable="false" className={icon}>
            <use xlinkHref="#ak-icon-cross" />
          </svg>
        </button>
      </React.Fragment>
    );
  }
}

// sort by permssion descending (admin -> land -> read)
function sortUsersByPermission(user1: IPermission, user2: IPermission) {
  const permssionsLevels = ['read', 'land', 'admin'];
  return permssionsLevels.indexOf(user2.mode) - permssionsLevels.indexOf(user1.mode);
}

export type Props = {
  users: UserState[];
  loggedInUser: ISessionUser;
};

export const UsersList: React.FunctionComponent<Props> = props => (
  <React.Fragment>
    <h3>Users</h3>
    <table>
      {props.users
        .sort(sortUsersByPermission)
        .map(({ aaid, mode, assignedByAaid, dateAssigned, note }) => (
          <tr
            key={`Assigned by ${assignedByAaid} on ${dateAssigned}`}
            title={`Assigned by ${assignedByAaid} on ${dateAssigned}`}
          >
            <User aaid={aaid}>
              {user => (
                <React.Fragment>
                  <td>
                    <PermissionControl
                      user={user}
                      userPermission={mode}
                      loggedInUser={props.loggedInUser}
                    />
                  </td>
                  <td style={{ width: '100%' }}>
                    <span style={{ verticalAlign: 'middle' }}>{user.displayName}</span>
                    {mode === 'admin' && <NoteManager aaid={aaid} note={note} />}
                  </td>
                </React.Fragment>
              )}
            </User>
          </tr>
        ))}
    </table>
  </React.Fragment>
);
