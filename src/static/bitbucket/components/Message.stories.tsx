import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';

import Message from './Message';

const bannerMessageOptions = {
  None: null,
  Default: {
    messageExists: true,
    message: 'Default banner message',
    messageType: 'default',
  },
  Warning: {
    messageExists: true,
    message: 'Banner message warning',
    messageType: 'warning',
  },
  Error: {
    messageExists: true,
    message: 'Banner message error',
    messageType: 'error',
  },
};

const queueOptions = {
  Running: [
    {
      request: { pullRequestId: 10 },
      state: 'running',
    },
    {
      request: { pullRequestId: 11 },
      state: 'running',
    },
    {
      request: { pullRequestId: 12 },
      state: 'queued',
    },
    {
      request: { pullRequestId: 13 },
      state: 'queued',
    },
  ],
  Waiting: [
    {
      request: { pullRequestId: 10 },
      state: 'queued',
    },
    {
      request: { pullRequestId: 11 },
      state: 'queued',
    },
    {
      request: { pullRequestId: 8 },
      state: 'running',
    },
    {
      request: { pullRequestId: 9 },
      state: 'running',
    },
  ],
};

export default {
  title: 'Message',
  component: Message,
  argTypes: {
    queue: {
      defaultValue: 'Running',
      options: Object.keys(queueOptions),
      mapping: queueOptions,
    },
    onCheckAgainClicked: {
      action: 'onCheckAgainClicked',
    },
    onLandWhenAbleClicked: {
      action: 'onLandWhenAbleClicked',
    },
    onLandClicked: {
      action: 'onLandClicked',
    },
    bannerMessage: {
      defaultValue: 'Default',
      options: Object.keys(bannerMessageOptions),
      mapping: bannerMessageOptions,
    },
  },
} as ComponentMeta<typeof Message>;

const Template: ComponentStory<typeof Message> = (args) => <Message {...args} />;

export const Configurable = Template.bind({});
Configurable.args = {
  appName: 'Landkid',
  status: 'can-land',
  canLandWhenAble: true,
  loadStatus: 'loaded',
  pullRequestId: 10,
  errors: [
    'All tasks must be resolved',
    'Must be approved',
    `Must be approved by the teams added as mandatory reviewers:
    <ul>
      <li>UIP: Monorepo - <a target="_blank" href="https://atlassian.slack.com/app_redirect?channel=atlassian-frontend">#atlassian-frontend</a></li>
      <li>Design System Team - <a target="_blank" href="https://atlassian.slack.com/app_redirect?channel=help-design-system">#help-design-system</a></li>
    </ul>`,
  ],
  warnings: [
    'The metadata for this PR has not yet been uploaded by the PR pipeline. See <a target="_blank" href="http://go.atlassian.com/af-package-ownership">go/af-package-ownership</a> for more information.',
  ],
};
