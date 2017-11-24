// @flow
import Queue from './Queue';
import { type Host, type CI } from './types';

export default class Runner {
  queue: Queue;


  constructor(queue: Queue, host: Host, ci: CI) {
    this.queue = queue;
  }

  next() {
    let item = this.queue.dequeue();

    // ...
  }
}
