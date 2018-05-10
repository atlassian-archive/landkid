// @flow
import type { LandRequest } from './types';

export default class Queue {
  queue: Array<LandRequest>;

  constructor() {
    this.queue = [];
  }

  list() {
    return Array.from(this.queue);
  }

  enqueue(model: LandRequest) {
    this.queue.push(model);
    // we'll return the new position in the queue so we dont have to search for it after enqueueing
    return this.queue.length - 1;
  }

  dequeue(): ?LandRequest {
    if (this.queue.length > 0) {
      return this.queue.shift();
    }
    return null;
  }

  filter(filterFn: (item: LandRequest) => boolean) {
    this.queue = this.queue.filter(filterFn);
  }
}
