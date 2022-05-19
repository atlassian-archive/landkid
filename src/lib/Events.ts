import { EventEmitter } from 'events';

import { config } from '../lib/Config';
import { Logger } from '../lib/Logger';
import { EventData } from '../types';

export const eventEmitter = new EventEmitter();

export const initializeEventListeners = () => {
  if (config.eventListeners) {
    config.eventListeners.forEach(({ event, listener }) => {
      eventEmitter.addListener(event, (data?: EventData) => {
        Logger.info(`Emitting event ${event}`, { data });
        listener(data || {}, { Logger });
      });
    });
  }
};
