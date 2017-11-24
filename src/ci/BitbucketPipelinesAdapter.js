// @flow
import { type CIAdapter, type StatusEvent } from '../types';

const BitbucketPipelinesAdapter: CIAdapter = async (config: {}) => ({
  processStatusWebhook(req): StatusEvent {
    // ...
  },
});

export default BitbucketPipelinesAdapter;
