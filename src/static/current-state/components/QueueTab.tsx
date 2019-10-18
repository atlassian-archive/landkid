import * as React from 'react';
import { Tab } from './Tab';
import { QueueItemsList } from './QueueItemsList';
import { EmptyState } from './EmptyState';

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
