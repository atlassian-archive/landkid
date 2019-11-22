import * as React from 'react';
import { Section } from './Section';
import { QueueItem } from './QueueItem';

export type Props = {
  queue: IStatusUpdate[];
  bitbucketBaseUrl: string;
};

function findRunning(updates: IStatusUpdate[]) {
  return updates.find(update => update.state === 'running') || null;
}

export const RunningBuild: React.FunctionComponent<Props> = props => {
  const running = findRunning(props.queue);
  if (!running)
    return React.createElement(
      'marquee',
      { style: { fontSize: '24px', color: 'lightskyblue' } },
      'No currently running builds',
    );

  return (
    <Section>
      <h3 style={{ marginBottom: '18px' }}>Running Build</h3>
      <QueueItem
        request={running.request}
        status={running}
        bitbucketBaseUrl={props.bitbucketBaseUrl}
      />
    </Section>
  );
};
