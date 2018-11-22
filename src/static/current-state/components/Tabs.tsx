import * as React from 'react';
import { css } from 'emotion';
import { Section } from './Section';
import { QueueItemsList, HistoryItemsList } from './QueueItemsList';
import { EmptyState } from './EmptyState';
import { WithAPIData } from './WithAPIData';

let controlsStyles = css({
  border: '1px solid var(--n20-color)',
  borderRadius: '2em',
  width: '408px',
  margin: '0 auto',
  display: 'flex',
  overflow: 'hidden',
  marginTop: '63px',

  '& button': {
    flexGrow: 1,
    fontSize: '1.14285714em',
    border: 'none',
    padding: '12px 0',
    background: 'transparent',
    color: 'var(--secondary-text-color)',
    margin: 0,

    '&.--selected': {
      background: 'var(--n20-color)',
      color: 'var(--n500-color)',
    },

    '&:hover, &.--selected:hover': {
      color: 'var(--n400-color)',
      background: 'rgba(9, 30, 66, 0.08)',
      cursor: 'pointer',
    },

    '&:focus': {
      outline: 'none',
      boxShadow: 'none',
    },

    '& + button': {
      borderLeft: '1px solid var(--n20-color)',
    },
  },
});

export type TabsControlsProps = {
  selected: number;
  selectTab: (tab: number) => void;
};

export function TabsControls(props: TabsControlsProps) {
  const { selected, selectTab } = props;
  return (
    <div className={controlsStyles}>
      <button
        onClick={() => selectTab(0)}
        className={`ak-button__appearance-subtle ${
          selected === 0 ? '--selected' : ''
        }`}
      >
        System
      </button>
      <button
        onClick={() => selectTab(1)}
        className={`ak-button__appearance-subtle ${
          selected === 1 ? '--selected' : ''
        }`}
      >
        Queue
      </button>
      <button
        onClick={() => selectTab(2)}
        className={`ak-button__appearance-subtle ${
          selected === 2 ? '--selected' : ''
        }`}
      >
        History
      </button>
    </div>
  );
}

let tabStyles = css({
  marginTop: '27px',
  position: 'relative',
  borderTop: '1px solid var(--n20-color)',

  '&:before': {
    position: 'absolute',
    display: 'block',
    content: '""',
    width: '1px',
    height: '27px',
    background: 'var(--n20-color)',
    top: '-27px',
    left: '50%',
    marginLeft: '-1px',
  },
});

export type QueueTabProps = {
  queue: IStatusUpdate[];
  bitbucketBaseUrl: string;
};

export const QueueTab: React.FunctionComponent<QueueTabProps> = props => {
  const { bitbucketBaseUrl, queue } = props;
  return (
    <div>
      <QueueItemsList
        bitbucketBaseUrl={bitbucketBaseUrl}
        queue={queue}
        fading
        renderEmpty={() => (
          <Tab>
            <EmptyState>Queue is empty...</EmptyState>
          </Tab>
        )}
      />
    </div>
  );
};

export type HistoryTabProps = {
  bitbucketBaseUrl: string;
};

export function HistoryTab(props: HistoryTabProps) {
  // TODO: WithAPIData
  // return <p>History here</p>;
  return (
    <WithAPIData<HistoryItem[]>
      poll={false}
      renderLoading={() => <Section>Loading...</Section>}
      endpoint="history"
      render={history => (
        <HistoryItemsList
          bitbucketBaseUrl={props.bitbucketBaseUrl}
          history={history}
          renderEmpty={() => (
            <Tab>
              <EmptyState>History is empty...</EmptyState>
            </Tab>
          )}
        />
      )}
    />
  );
}

export type SystemTabProps = { allowedUsers: Array<string> };
export const SystemTab: React.FunctionComponent<SystemTabProps> = props => {
  const { allowedUsers } = props;
  return (
    <Tab>
      <div style={{ marginTop: '27px' }}>
        <h3>Allowed Users</h3>
        <p>{allowedUsers.join(', ')}</p>
      </div>
    </Tab>
  );
};

export const Tab: React.FunctionComponent = props => {
  const { children } = props;
  return <div className={tabStyles}>{children}</div>;
};

export type TabsProps = {
  selected: number;
  allowedUsers: Array<string>;
  queue: IStatusUpdate[];
  bitbucketBaseUrl: string;
};

export type TabsState = {
  selected: number;
};

export class Tabs extends React.Component<TabsProps, TabsState> {
  state: TabsState = {
    selected: 1,
  };

  private onTabSelected = (selected: number) => this.setState({ selected });

  render() {
    let { selected } = this.state;
    let { allowedUsers, bitbucketBaseUrl, queue } = this.props;

    return (
      <Section important last>
        <TabsControls selectTab={this.onTabSelected} selected={selected} />
        {selected === 0 ? <SystemTab allowedUsers={allowedUsers} /> : null}
        {selected === 1 ? (
          <QueueTab bitbucketBaseUrl={bitbucketBaseUrl} queue={queue} />
        ) : null}
        {selected === 2 ? (
          <HistoryTab bitbucketBaseUrl={bitbucketBaseUrl} />
        ) : null}
      </Section>
    );
  }
}
