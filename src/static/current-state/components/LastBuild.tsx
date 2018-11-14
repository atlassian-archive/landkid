import * as React from 'react';
import { Section } from './Section';
import { QueueItem } from './QueueItem';
import { HistoryItem } from '../../../types';

export type Props = {
  historyItem?: HistoryItem;
};

export const LastBuild: React.FunctionComponent<Props> = props => {
  if (!props.historyItem) return null;

  return (
    <Section>
      <h3 style={{ marginBottom: '18px' }}>Last Build</h3>
      <QueueItem
        build={props.historyItem.build}
        statusEvent={props.historyItem.statusEvent}
      />
    </Section>
  );
};
