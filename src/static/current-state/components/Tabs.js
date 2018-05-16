// @flow

import React from 'react';
import type { Node } from 'react';
import { css } from 'emotion';
import { Section } from './Section';
import { QueueItemJoined } from './QueueItem';
import { QueueItemsList, HistoryItemsList } from './QueueItemsList';
import { EmptyState } from './EmptyState';
import type { LandRequest, HistoryItem } from '../../../types';

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
      color: 'var(--n500-color)'
    },

    '&:hover, &.--selected:hover': {
      color: 'var(--n400-color)',
      background: 'rgba(9, 30, 66, 0.08)',
      cursor: 'pointer'
    },

    '&:focus': {
      outline: 'none',
      boxShadow: 'none'
    },

    '& + button': {
      borderLeft: '1px solid var(--n20-color)'
    }
  }
});

export function TabsControls({
  selected,
  selectTab
}: {
  selected: number,
  selectTab: (tab: number) => void
}) {
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
    marginLeft: '-1px'
  }
});

export function QueueTab({
  running,
  queue
}: {
  running: LandRequest,
  queue: Array<LandRequest>
}) {
  return (
    <div>
      {running.buildId ? <QueueItemJoined build={running} /> : null}
      <QueueItemsList
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
}

export function HistoryTab({ history }: { history: Array<HistoryItem> }) {
  return (
    <HistoryItemsList
      history={history}
      renderEmpty={() => (
        <Tab>
          <EmptyState>History is empty...</EmptyState>
        </Tab>
      )}
    />
  );
}

export function SystemTab({ allowedUsers }: { allowedUsers: Array<string> }) {
  return (
    <Tab>
      <div style={{ marginTop: '27px' }}>
        <h3>Allowed Users</h3>
        <p>{allowedUsers.join(', ')}</p>
      </div>
    </Tab>
  );
}

export function Tab({ children }: { children: Node }) {
  return <div className={tabStyles}>{children}</div>;
}

export type TabsProps = {
  selected: number,
  allowedUsers: Array<string>,
  running: LandRequest,
  queue: Array<LandRequest>,
  history: Array<HistoryItem>
};

export class Tabs extends React.Component<TabsProps, { selected: number }> {
  onTabSelected: (selected: number) => void;

  constructor(props: TabsProps) {
    super(props);
    this.state = { selected: this.props.selected };
    this.onTabSelected = selected => this.setState({ selected });
  }

  render() {
    let { selected } = this.state;
    let { allowedUsers, running, queue, history } = this.props;

    return (
      <Section important last>
        <TabsControls selectTab={this.onTabSelected} selected={selected} />
        {selected === 0 ? <SystemTab allowedUsers={allowedUsers} /> : null}
        {selected === 1 ? <QueueTab running={running} queue={queue} /> : null}
        {selected === 2 ? <HistoryTab history={history} /> : null}
      </Section>
    );
  }
}
