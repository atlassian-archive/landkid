import * as React from 'react';
import { TabContent } from './TabContent';
import { QueueItemsList } from '../QueueItemsList';
import { EmptyState } from '../EmptyState';

export type QueueTabProps = {
  bitbucketBaseUrl: string;
  loggedInUser: ISessionUser;
  queue: IStatusUpdate[];
  permissionsMessage: string;
  refreshData: () => void;
};

export const QueueTab: React.FunctionComponent<QueueTabProps> = (props) => {
  const { bitbucketBaseUrl, loggedInUser, queue, permissionsMessage, refreshData } = props;
  return (
    <div>
      <QueueItemsList
        bitbucketBaseUrl={bitbucketBaseUrl}
        queue={queue}
        fading
        renderEmpty={() => (
          <TabContent>
            <EmptyState>
              {loggedInUser.permission === 'read' ? permissionsMessage : 'Queue is empty...'}
            </EmptyState>
          </TabContent>
        )}
        refreshData={refreshData}
      />
    </div>
  );
};
