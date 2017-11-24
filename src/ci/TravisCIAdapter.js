// @flow
import { type CIAdapter, type StatusEvent } from '../types';

const TravisCIAdapter: CIAdapter = async (config: {}) => ({
  processStatusWebhook(body): StatusEvent | null {
    // ...
  },

  async createLandBuild(commit: string) {},

  async isLandBuildRunning(): Promise<boolean> {}
});

export default TravisCIAdapter;
