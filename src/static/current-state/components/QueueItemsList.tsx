import * as React from 'react';
import { css } from 'emotion';
import { QueueItemJoined } from './QueueItem';
import { EmptyState } from './EmptyState';
import { LandRequest, HistoryItem } from '../../../types';

let fadingStyles = css({
  '& .queue-item-joined:nth-child(1) .queue-item': {
    opacity: 0.7,
  },
  '& .queue-item-joined:nth-child(2) .queue-item': {
    opacity: 0.5,
  },
  '& .queue-item-joined:nth-child(n+3) .queue-item': {
    opacity: 0.3,
  },
});

export type QueueItemsListProps = {
  queue: Array<LandRequest>;
  fading?: boolean;
  renderEmpty?: () => JSX.Element;
};

export const QueueItemsList: React.FunctionComponent<
  QueueItemsListProps
> = props => {
  const { queue, fading, renderEmpty } = props;
  if (!queue.length) {
    return renderEmpty ? renderEmpty() : <EmptyState>Empty...</EmptyState>;
  }

  return (
    <div className={fading ? fadingStyles : ''}>
      {queue.map(item => <QueueItemJoined build={item} />)}
    </div>
  );
};

export type HistoryItemsListProps = {
  history: Array<HistoryItem>;
  renderEmpty?: () => JSX.Element;
};

export const HistoryItemsList: React.FunctionComponent<
  HistoryItemsListProps
> = props => {
  const { history, renderEmpty } = props;
  if (!history.length) {
    return renderEmpty ? renderEmpty() : <EmptyState>Empty...</EmptyState>;
  }

  return (
    <div>
      {history.map(item => (
        <QueueItemJoined build={item.build} statusEvent={item.statusEvent} />
      ))}
    </div>
  );
};
