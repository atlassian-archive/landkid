import * as React from 'react';

export type Props = {
  aaid: string;
  placeholder?: React.StatelessComponent;
  children: (user: ISessionUser) => React.ReactChild;
};

export type State = {
  info?: ISessionUser;
};

export class User extends React.Component<Props, State> {
  state: State = {};

  componentDidMount() {
    this.fetch(this.props.aaid);
  }

  componentWillUpdate(newProps: Props) {
    if (newProps.aaid !== this.props.aaid) {
      this.fetch(this.props.aaid);
    }
  }

  private key = (aaid: string) => `user-info:${aaid}`;

  private async fetch(aaid: string) {
    const cached = localStorage.getItem(this.key(aaid));
    if (cached) {
      return this.setState({
        info: JSON.parse(cached),
      });
    }
    const response = await fetch(`/api/user/${aaid}`);
    const fresh = await response.json();
    localStorage.setItem(this.key(aaid), JSON.stringify(fresh));
    this.setState({
      info: fresh,
    });
  }

  render() {
    const Placeholder = this.props.placeholder;
    if (!this.state.info) {
      if (Placeholder) return <Placeholder />;
      return null;
    }

    return this.props.children(this.state.info);
  }
}
