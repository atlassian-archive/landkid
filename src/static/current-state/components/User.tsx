import * as React from 'react';

type UserInfo = {
  displayName: string;
  username: string;
  aaid: string;
};

export type Props = {
  aaid: string;
  placeholder?: React.StatelessComponent;
  children: (user: UserInfo) => React.ReactChild;
};

export type State = {
  info?: UserInfo;
};

export class User extends React.Component<Props, State> {
  state: State = {};

  // TODO: Fetch info for AAID in memoized / cached way

  render() {
    const Placeholder = this.props.placeholder;
    if (!this.state.info) {
      if (Placeholder) return <Placeholder />;
      return null;
    }

    return this.props.children(this.state.info);
  }
}
