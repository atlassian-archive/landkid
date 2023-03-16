import React from 'react';
import { getGroupedByTargetBranch } from '../../utils/LandRequestUtils';
import { EmptyState } from '../EmptyState';
import { QueueItemsList } from '../QueueItemsList';
import { TabContent } from './TabContent';

export type Props = {
  bitbucketBaseUrl: string;
  loggedInUser: ISessionUser;
  merging: IStatusUpdate[];
  permissionsMessage: string;
  refreshData: () => void;
};

export const MergingTab: React.FunctionComponent<Props> = (props) => {
  const { bitbucketBaseUrl, merging, refreshData } = props;
  if (merging.length === 0) {
    return (
      <TabContent>
        <EmptyState>Merging queue is empty...</EmptyState>
      </TabContent>
    );
  }

  const groupedByTargetBranch: { [branch: string]: IStatusUpdate[] } =
    getGroupedByTargetBranch(merging);
  return (
    <>
      {Object.keys(groupedByTargetBranch).map((branch) => (
        <div style={{ paddingTop: '27px' }} key={branch}>
          <QueueItemsList
            bitbucketBaseUrl={bitbucketBaseUrl}
            queue={groupedByTargetBranch[branch]}
            refreshData={refreshData}
            running={true}
            fading
          />
        </div>
      ))}
    </>
  );
};
