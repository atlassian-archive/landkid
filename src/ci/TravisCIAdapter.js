// @flow
import { type CIAdapter, type StatusEvent } from '../types';

const TravisCIAdapter: CIAdapter = async (config: {}) => ({
  processStatusWebhook(req): StatusEvent {
    // ...
  },

  async createLandBuild(commit: string) {

  },

  async isLandBuildRunning(): Promise<boolean> {

  },
});

export default TravisCIAdapter;
