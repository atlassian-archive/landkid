import * as React from 'react';
import { TabContent } from './TabContent';
import { QueueItemsList } from '../QueueItemsList';
import { EmptyState } from '../EmptyState';

export type QueueTabProps = {
  bitbucketBaseUrl: string;
  loggedInUser: ISessionUser;
  queue: IStatusUpdate[];
  permissionsMessage?: string;
};

export const QueueTab: React.FunctionComponent<QueueTabProps> = props => {
  const { bitbucketBaseUrl, loggedInUser, queue, permissionsMessage } = props;
  return (
    <div>
      <QueueItemsList
        bitbucketBaseUrl={bitbucketBaseUrl}
        queue={queue}
        fading
        renderEmpty={() => (
          <TabContent>
            <EmptyState>
              {loggedInUser.permission === 'admin' ? permissionsMessage : 'Queue is empty...'}
            </EmptyState>
          </TabContent>
        )}
      />
    </div>
  );
};
