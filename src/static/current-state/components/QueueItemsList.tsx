import React from 'react';
import { css } from 'emotion';
import { QueueItem, QueueItemJoined } from './QueueItem';
import { EmptyState } from './EmptyState';

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
  running?: boolean;
  bitbucketBaseUrl: string;
  refreshData: () => void;
};

export const QueueItemsList: React.FunctionComponent<QueueItemsListProps> = (props) => {
  const { queue, fading, renderEmpty, running, refreshData } = props;
  const filteredQueue = queue.filter((item) => running || item.state === 'queued');
  if (!filteredQueue.length) {
    return renderEmpty ? renderEmpty() : <EmptyState>Empty...</EmptyState>;
  }

  return (
    <div className={fading ? fadingStyles : ''}>
      {filteredQueue.map((item, index) =>
        running && index === 0 ? (
          <QueueItem
            bitbucketBaseUrl={props.bitbucketBaseUrl}
            status={item}
            key={item.requestId}
            queue={queue}
            refreshData={refreshData}
          />
        ) : (
          <QueueItemJoined
            bitbucketBaseUrl={props.bitbucketBaseUrl}
            status={item}
            key={item.requestId}
            queue={queue}
            refreshData={refreshData}
          />
        ),
      )}
    </div>
  );
};
