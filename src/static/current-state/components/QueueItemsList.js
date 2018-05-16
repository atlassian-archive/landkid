// @flow

import React from 'react';
import type { Node } from 'react';
import { css } from 'emotion';
import { QueueItemJoined } from './QueueItem';
import { EmptyState } from './EmptyState';
import type { LandRequest, HistoryItem } from '../../../types';

let fadingStyles = css({
  '& .queue-item-joined:nth-child(1) .queue-item': {
    opacity: 0.7
  },
  '& .queue-item-joined:nth-child(2) .queue-item': {
    opacity: 0.5
  },
  '& .queue-item-joined:nth-child(n+3) .queue-item': {
    opacity: 0.3
  }
});

export function QueueItemsList({
  queue,
  fading,
  renderEmpty
}: {
  queue: Array<LandRequest>,
  fading?: boolean,
  renderEmpty?: () => Node
}) {
  if (!queue.length) {
    return renderEmpty ? renderEmpty() : <EmptyState>Empty...</EmptyState>;
  }

  return (
    <div className={fading ? fadingStyles : ''}>
      {queue.map(item => <QueueItemJoined build={item} />)}
    </div>
  );
}

export function HistoryItemsList({
  history,
  renderEmpty
}: {
  history: Array<HistoryItem>,
  renderEmpty?: () => Node
}) {
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
}
