// @flow
import { type CIAdapter, type StatusEvent } from '../types';

const CircleCIAdapter: CIAdapter = async (config: {}) => ({
  processStatusWebhook(req): StatusEvent {
    // ...
  },
});

export default CircleCIAdapter;
