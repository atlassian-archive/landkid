import * as React from 'react';
import { css } from 'emotion';
import { Section } from '../Section';
import { SystemTab } from './SystemTab';
import { QueueTab } from './QueueTab';
import { HistoryTab } from './HistoryTab';

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

const TabsControls: React.FunctionComponent<TabsControlsProps> = (props) => {
  const { selected, selectTab } = props;
  return (
    <div className={controlsStyles}>
      <button
        onClick={() => selectTab(0)}
        className={`ak-button__appearance-subtle ${selected === 0 ? '--selected' : ''}`}
      >
        System
      </button>
      <button
        onClick={() => selectTab(1)}
        className={`ak-button__appearance-subtle ${selected === 1 ? '--selected' : ''}`}
      >
        Queue
      </button>
      <button
        onClick={() => selectTab(2)}
        className={`ak-button__appearance-subtle ${selected === 2 ? '--selected' : ''}`}
      >
        History
      </button>
    </div>
  );
};

export type TabsProps = {
  selected: number;
  users: UserState[];
  queue: IStatusUpdate[];
  bitbucketBaseUrl: string;
  loggedInUser: ISessionUser;
  paused: boolean;
  bannerMessageState: IMessageState | null;
  permissionsMessage: string;
  refreshData: () => void;
};

type TabsState = {
  selected: number;
};

export class Tabs extends React.Component<TabsProps, TabsState> {
  constructor(props: TabsProps) {
    super(props);

    let selected = 1;
    const selectedItem = sessionStorage.getItem('selectedTab');
    if (selectedItem) {
      selected = parseInt(selectedItem);
    }

    this.state = {
      selected: isNaN(selected) || ![0, 1, 2].includes(selected) ? 1 : selected,
    };
  }

  private onTabSelected = (selected: number) => {
    this.setState({ selected });
    sessionStorage.setItem('selectedTab', selected.toString());
  };

  render() {
    const { selected } = this.state;
    const {
      users,
      bitbucketBaseUrl,
      queue,
      loggedInUser,
      paused,
      bannerMessageState,
      permissionsMessage,
      refreshData,
    } = this.props;

    return (
      <Section important last>
        <TabsControls selectTab={this.onTabSelected} selected={selected} />
        {selected === 0 ? (
          <SystemTab
            users={users}
            loggedInUser={loggedInUser}
            defaultPaused={paused}
            bannerMessageState={bannerMessageState}
            refreshData={refreshData}
          />
        ) : null}
        {selected === 1 ? (
          <QueueTab
            bitbucketBaseUrl={bitbucketBaseUrl}
            loggedInUser={loggedInUser}
            queue={queue}
            permissionsMessage={permissionsMessage}
            refreshData={refreshData}
          />
        ) : null}
        {selected === 2 ? (
          <HistoryTab
            bitbucketBaseUrl={bitbucketBaseUrl}
            loggedInUser={loggedInUser}
            permissionsMessage={permissionsMessage}
          />
        ) : null}
      </Section>
    );
  }
}
