import * as React from 'react';
import { css } from 'emotion';
import { QueueItemJoined } from './QueueItem';
import { EmptyState } from './EmptyState';
import { HistoryItem } from '../../../types';

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
  queue: Array<IStatusUpdate>;
  fading?: boolean;
  renderEmpty?: () => JSX.Element;
  bitbucketBaseUrl: string;
};

export const QueueItemsList: React.FunctionComponent<
  QueueItemsListProps
> = props => {
  const { queue, fading, renderEmpty } = props;
  const filteredQueue = queue.filter(item => item.state !== 'running');
  if (!filteredQueue.length) {
    return renderEmpty ? renderEmpty() : <EmptyState>Empty...</EmptyState>;
  }

  return (
    <div className={fading ? fadingStyles : ''}>
      {filteredQueue.map(item => (
        <QueueItemJoined
          bitbucketBaseUrl={props.bitbucketBaseUrl}
          request={item.request}
          status={item}
        />
      ))}
    </div>
  );
};

export type HistoryItemsListProps = {
  history: Array<HistoryItem>;
  renderEmpty?: () => JSX.Element;
  bitbucketBaseUrl: string;
};

export const HistoryItemsList: React.FunctionComponent<
  HistoryItemsListProps
> = props => {
  const { history, renderEmpty } = props;
  if (!history.length) {
    return renderEmpty ? renderEmpty() : <EmptyState>Empty...</EmptyState>;
  }

  // TODO: Use latest status event, not just the index 0
  return (
    <div>
      {history.map(item => (
        <QueueItemJoined
          bitbucketBaseUrl={props.bitbucketBaseUrl}
          request={item.request}
          status={item.statusEvents[0]}
        />
      ))}
    </div>
  );
};
