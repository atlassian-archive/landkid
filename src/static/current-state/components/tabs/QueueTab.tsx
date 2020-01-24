import * as React from 'react';
import { TabContent } from './TabContent';
import { QueueItemsList } from '../QueueItemsList';
import { EmptyState } from '../EmptyState';

export type QueueTabProps = {
  bitbucketBaseUrl: string;
  loggedInUser: ISessionUser;
  queue: IStatusUpdate[];
};

export const QueueTab: React.FunctionComponent<QueueTabProps> = props => {
  const { bitbucketBaseUrl, loggedInUser, queue } = props;
  return (
    <div>
      <QueueItemsList
        bitbucketBaseUrl={bitbucketBaseUrl}
        queue={queue}
        fading
        renderEmpty={() => (
          <TabContent>
            <EmptyState>
              {loggedInUser.permission === 'read'
                ? 'Contact an admin for permission to view this information'
                : 'Queue is empty...'}
            </EmptyState>
          </TabContent>
        )}
      />
    </div>
  );
};
