import * as path from 'path';

import { Config } from '../types';

const getConfig = (): Config | null => {
  try {
    return require(path.resolve(process.cwd(), 'config.js'));
  } catch (e) {
    return null;
  }
};

export const config = getConfig()!;

export const hasConfig = config !== null;
