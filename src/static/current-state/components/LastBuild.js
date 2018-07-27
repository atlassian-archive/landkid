// @flow

import React from 'react';
import { Section } from './Section';
import { QueueItem } from './QueueItem';
import type { HistoryItem } from '../../../types';

export function LastBuild(props: { historyItem?: HistoryItem }) {
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
}
