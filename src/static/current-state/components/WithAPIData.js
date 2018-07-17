// @flow

import React from 'react';
import type { Node } from 'react';

const DEFAULT_POLLING_INTERVAL = 15 * 1000; // 15 sec

function defaultLoading() {
  return <div>Loading...</div>;
}

export type WithAPIDataProps = {
  endpoint: string,
  poll?: number | boolean,
  renderError?: (err: Error) => Node,
  renderLoading?: () => Node,
  render?: (data: any) => Node,
};

export class WithAPIData extends React.Component<
  WithAPIDataProps,
  { error: Error | null, data: any, poll: number },
> {
  interval: ?IntervalID;

  constructor(props: WithAPIDataProps) {
    super(props);
    this.state = {
      error: null,
      data: null,
      poll:
        props.poll === true
          ? DEFAULT_POLLING_INTERVAL
          : props.poll ? props.poll : 0,
    };
  }

  fetchData() {
    fetch(`/api/${this.props.endpoint}`)
      .then(res => res.json())
      .then(data => this.setState({ data }))
      .catch(error => this.setState({ error }));
  }

  componentDidMount() {
    this.fetchData();

    if (this.state.poll) {
      this.interval = setInterval(this.fetchData.bind(this), this.state.poll);
    }
  }

  componentWillUnmount() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  render() {
    let { error, data } = this.state;
    let { renderError, render, renderLoading } = this.props;

    if (error) {
      return renderError ? renderError(error) : null;
    } else if (data) {
      return render ? render(data) : null;
    }

    return renderLoading ? renderLoading() : defaultLoading();
  }
}
