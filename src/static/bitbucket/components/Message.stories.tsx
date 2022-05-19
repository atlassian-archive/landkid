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

export default {
  title: 'Message',
  component: Message,
  argTypes: {
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
    loading: {
      control: { type: 'select' },
      options: [undefined, 'land', 'land-when-able'],
    },
  },
} as ComponentMeta<typeof Message>;

const Template: ComponentStory<typeof Message> = (args) => <Message {...args} />;

export const Configurable = Template.bind({});
Configurable.args = {
  appName: 'Landkid',
  status: 'can-land',
  canLandWhenAble: true,
  loading: null,
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
