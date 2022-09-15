import { ComponentStory, ComponentMeta } from '@storybook/react';

import { QueueBase } from './Queue';

export default {
  title: 'Queue',
  component: QueueBase,
  argTypes: {
    loadingState: {
      control: { type: 'select' },
      options: ['not-loaded', 'loading', 'refreshing', 'error', 'loaded'],
    },
  },
} as ComponentMeta<typeof QueueBase>;

const Template: ComponentStory<typeof QueueBase> = (args) => <QueueBase {...args} />;

export const Configurable = Template.bind({});

Configurable.args = {
  pullRequestId: 1,
  currentState: {
    queue: [{ request: { pullRequestId: 1 } }, { request: { pullRequestId: 2 } }],
    waitingToQueue: [
      { request: { pullRequestId: 3 } },
      { request: { pullRequestId: 4 } },
      { request: { pullRequestId: 5 } },
    ],
  },
};
