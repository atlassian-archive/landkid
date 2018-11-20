// import { LandRequest } from './types';

// export default class Queue {
//   private queue: Array<LandRequest> = [];

//   list() {
//     return Array.from(this.queue);
//   }

//   enqueue(model: LandRequest) {
//     this.queue.push(model);
//     // we'll return the new position in the queue so we dont have to search for it after enqueueing
//     return this.queue.length - 1;
//   }

//   dequeue(): LandRequest | null {
//     return this.queue.shift() || null;
//   }

//   filter(filterFn: (item: LandRequest) => boolean) {
//     this.queue = this.queue.filter(filterFn);
//   }
// }
