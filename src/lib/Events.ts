import { EventEmitter } from 'events';

import { config } from '../lib/Config';
import { Logger } from '../lib/Logger';

export const eventEmitter = new EventEmitter();

export const initializeEventListeners = () => {
  if (config.eventListeners) {
    config.eventListeners.forEach(({ event, listener }) => {
      eventEmitter.addListener(event, (...args: any[]) => {
        Logger.verbose(`Emitting event ${event}`, { args });
        listener(...args);
      });
    });
  }
};
