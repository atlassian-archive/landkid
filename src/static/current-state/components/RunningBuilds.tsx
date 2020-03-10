import * as React from 'react';
import { Section } from './Section';
import { QueueItemsList } from './QueueItemsList';

export type Props = {
  queue: IStatusUpdate[];
  bitbucketBaseUrl: string;
};

// function findRunning(updates: IStatusUpdate[]) {
//   return updates.filter(update => ['running', 'awaiting-merge'].includes(update.state));
// }

export const RunningBuilds: React.FunctionComponent<Props> = props => {
  // const running = findRunning(props.queue);

  if (props.queue.length === 0) {
    return React.createElement(
      'marquee',
      { style: { fontSize: '24px', color: 'lightskyblue' } },
      'No currently running builds',
    );
  }

  const groupedByTargetBranch: { [branch: string]: IStatusUpdate[] } = {};
  props.queue.forEach(item => {
    const targetBranch = item.request.pullRequest.targetBranch || item.requestId;
    if (!groupedByTargetBranch[targetBranch]) {
      groupedByTargetBranch[targetBranch] = [item];
    } else {
      groupedByTargetBranch[targetBranch].push(item);
    }
  });

  return (
    <Section>
      <h3>Running Builds</h3>
      {Object.keys(groupedByTargetBranch).map(branch => (
        <div style={{ paddingTop: '27px' }}>
          <QueueItemsList
            bitbucketBaseUrl={props.bitbucketBaseUrl}
            queue={groupedByTargetBranch[branch]}
            running
          />
        </div>
      ))}
    </Section>
  );
};
