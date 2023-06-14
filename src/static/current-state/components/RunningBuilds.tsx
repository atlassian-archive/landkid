import React from 'react';
import { Section } from './Section';
import { QueueItemsList } from './QueueItemsList';
import { getGroupedByTargetBranch } from '../utils/LandRequestUtils';

export type Props = {
  queue: IStatusUpdate[];
  bitbucketBaseUrl: string;
  refreshData: () => void;
};

function findRunning(updates: IStatusUpdate[]) {
  return updates.filter(({ state }) => state === 'running');
}

export const RunningBuilds: React.FunctionComponent<Props> = (props) => {
  const { bitbucketBaseUrl, refreshData, queue } = props;
  const running = findRunning(queue);

  if (running.length === 0) {
    return React.createElement(
      'marquee',
      { style: { fontSize: '24px', color: 'lightskyblue' } },
      'No currently running builds',
    );
  }

  const groupedByTargetBranch: { [branch: string]: IStatusUpdate[] } =
    getGroupedByTargetBranch(running);

  return (
    <Section>
      <h3>Running Builds</h3>
      {Object.keys(groupedByTargetBranch).map((branch) => (
        <div style={{ paddingTop: '27px' }}>
          <QueueItemsList
            bitbucketBaseUrl={bitbucketBaseUrl}
            queue={groupedByTargetBranch[branch]}
            allQueueItems={queue}
            refreshData={refreshData}
            running
          />
        </div>
      ))}
    </Section>
  );
};
