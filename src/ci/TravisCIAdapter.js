// @flow
import { type CIAdapter, type StatusEvent } from '../types';

const TravisCIAdapter: CIAdapter = async (config: {}) => ({
  processStatusWebhook(req): StatusEvent {
    // ...
  },
});

export default TravisCIAdapter;
