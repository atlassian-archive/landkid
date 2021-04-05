import { EventEmitter } from 'events';
import { config } from '../lib/Config';

const eventEmitter = new EventEmitter();

const events = [
  'STARTUP',
  'PULL_REQUEST.MERGE.SUCCESS',
  'PULL_REQUEST.MERGE.FAIL',
  'GET_STATE.SUCCESS',
  'GET_STATE.FAIL',
  'PULL_REQUEST.QUEUE.SUCCESS',
  'PULL_REQUEST.QUEUE.FAIL',
  'PULL_REQUEST.QUEUE_WHEN_ABLE.SUCCEED',
  'PULL_REQUEST.QUEUE_WHEN_ABLE.FAIL',
  'PULL_REQUEST.QUEUED_DURATION_MS',
];

events.forEach(event => {
  eventEmitter.on(event, args => {
    const eventListener =
      config.eventListeners &&
      config.eventListeners.find(eventListener => event === eventListener.event);

    if (eventListener && eventListener.listeners) {
      eventListener.listeners.forEach(listener => listener(args));
    }

    if (eventListener && eventListener.listener) {
      eventListener.listener(args);
    }
  });
});
