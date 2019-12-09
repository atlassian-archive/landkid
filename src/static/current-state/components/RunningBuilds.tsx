import * as React from 'react';
import { Section } from './Section';
import { QueueItemsList } from './QueueItemsList';

export type Props = {
  queue: IStatusUpdate[];
  bitbucketBaseUrl: string;
};

// function findRunning(updates: IStatusUpdate[]) {
//   return updates.filter(update => update.state === 'running');
// }

export const RunningBuilds: React.FunctionComponent<Props> = props => {
  return (
    <Section>
      <h3 style={{ marginBottom: '18px' }}>Running Builds</h3>
      <QueueItemsList
        bitbucketBaseUrl={props.bitbucketBaseUrl}
        queue={props.queue}
        running
        renderEmpty={() =>
          React.createElement(
            'marquee',
            { style: { fontSize: '24px', color: 'lightskyblue' } },
            'No currently running builds',
          )
        }
      />
    </Section>
  );
};
