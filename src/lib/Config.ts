import * as path from 'path';

import { Config } from '../types';
import { Logger } from './Logger';

const getConfig = (): Config | null => {
  try {
    const config = require(path.resolve(process.cwd(), 'config.js')) as Config;

    // Some parts of the config that are commonly forgotten deserve a louder, more descriptive message
    let configValid = true;
    if (!config.repoConfig.botPassword || !config.repoConfig.botUsername) {
      Logger.error('repoConfig.botPassword or repoConfig.botUsername are missing');
      Logger.error('Did you forget to set an environment variable?');
      configValid = false;
    }

    if (!config.deployment.oAuth.secret || !config.deployment.oAuth.key) {
      Logger.error('deployment.oAuth.secret or deployment.oAuth.key are missing');
      Logger.error('Did you forget to set an environment variable?');
      configValid = false;
    }

    if (!configValid) {
      throw new Error('Config is invalid');
    }

    return config;
  } catch (e) {
    return null;
  }
};

export const config = getConfig()!;

export const hasConfig = config !== null;
