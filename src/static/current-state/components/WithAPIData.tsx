import * as React from 'react';

const DEFAULT_POLLING_INTERVAL = 15 * 1000; // 15 sec

function defaultLoading() {
  return <div>Loading...</div>;
}

export type Props<D> = {
  endpoint: string;
  poll?: number | boolean;
  renderError?: (err: Error) => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  render?: (data: D) => React.ReactNode;
};

export type State = {
  error: Error | null;
  data: any;
  poll: number;
};

export class WithAPIData<T> extends React.Component<Props<T>, State> {
  interval: NodeJS.Timeout | null = null;
  state = {
    error: null,
    data: null,
    poll:
      this.props.poll === true ? DEFAULT_POLLING_INTERVAL : this.props.poll ? this.props.poll : 0,
  };

  fetchData() {
    fetch(`/${this.props.endpoint}`)
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

  componentWillReceiveProps(newProps: any) {
    if (newProps.endpoint !== this.props.endpoint) {
      this.setState(
        {
          data: null,
        },
        this.fetchData,
      );
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
