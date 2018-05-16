// @flow

import type { StatusEvent, LandRequest, HistoryItem } from './types';

export default class History {
  history: Array<HistoryItem>;

  constructor() {
    this.history = [];
  }

  set(statusEvent: StatusEvent, build: LandRequest) {
    this.history.unshift({
      statusEvent,
      build
    });
  }

  take(num: number, offset?: number = 0): Array<HistoryItem> {
    return this.history.slice(offset, offset + num);
  }

  last(): HistoryItem {
    return this.history[this.history.length - 1];
  }
}
