import * as React from 'react';

export type Props = {
  user: ISessionUser;
  userPermission: IPermissionMode;
  loggedInUser: ISessionUser;
};

export type State = {
  actualPermission: IPermissionMode;
  loading: boolean;
};

export class PermissionControl extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      actualPermission: props.userPermission,
      loading: false,
    };
  }

  onPermissionChange: React.ChangeEventHandler<HTMLSelectElement> = e => {
    const mode = e.target.value as IPermissionMode;
    this.setState({ loading: true }, () => {
      fetch(`/api/permission/${this.props.user.aaid}`, {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ mode }),
      }).then(() => {
        this.setState({
          loading: false,
          actualPermission: mode,
        });
      });
    });
  };

  render() {
    const { loggedInUser } = this.props;
    const { actualPermission, loading } = this.state;
    return (
      <React.Fragment>
        <select
          value={actualPermission}
          disabled={loggedInUser.permission !== 'admin' || loading}
          onChange={this.onPermissionChange}
          style={{ marginRight: '10px' }}
        >
          <option value="read">Read</option>
          <option value="land">Land</option>
          <option value="admin">Admin</option>
        </select>
        {loading && <div>🤔...</div>}
      </React.Fragment>
    );
  }
}
