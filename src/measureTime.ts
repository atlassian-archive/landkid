import { Logger } from './lib/Logger';
import { performance } from 'perf_hooks';

export default class MeasureTime {
  startTimer: number;

  constructor() {
    this.startTimer = performance.now();
  }

  measure(label: string, namespace: string) {
    Logger.info(`TIME: ${label} is ${performance.now() - this.startTimer} ms`, {
      namespace: `bitbucket:client:measureTime:${namespace}`,
    });
    this.startTimer = performance.now();
  }
}
