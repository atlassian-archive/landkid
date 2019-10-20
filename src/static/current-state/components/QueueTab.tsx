import * as React from 'react';
import { TabContent } from './TabContent';
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
          <TabContent>
            <EmptyState>Queue is empty...</EmptyState>
          </TabContent>
        )}
      />
    </div>
  );
};
