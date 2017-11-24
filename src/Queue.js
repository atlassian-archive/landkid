// @flow
import writeJsonFile from 'write-json-file';
import readJsonFile from 'load-json-file';
import pathExists from 'path-exists';
import { promisify } from 'util';
import lockFile from 'lockfile';

const lock = promisify(lockFile.lock);
const unlock = promisify(lockFile.unlock);

type QueueItem = {
  buildId: string | null,
  pullRequestId: string;
  userId: string;
  commentId: string;
};

function validate(item: any): QueueItem {
  if (
    item !== null &&
    typeof item === 'object' &&
    !Array.isArray(item) &&
    typeof item.pullRequestId === 'string' &&
    typeof item.commentId === 'string' &&
    typeof item.userId === 'string' &&
    (typeof item.buildId === 'string' || item.buildId === null)
  ) {
    return item;
  } else {
    throw new TypeError(`queue item is invalid: ${JSON.stringify(item)}`);
  }
}

export default class Queue {
  queuePath: string;
  lockPath: string;

  constructor(queuePath: string, lockPath: string) {
    this.queuePath = queuePath;
    this.lockPath = lockPath;
  }

  async init() {
    if (!await pathExists(this.queuePath)) {
      this.write([]);
    }
  }

  async read(): Promise<Array<QueueItem>> {
    let data = await readJsonFile(this.queuePath);
    return data.map(item => validate(item));
  }

  async write(data: Array<QueueItem>): Promise<void> {
    await writeJsonFile(this.queuePath, data.map(item => validate(item)));
  }

  async lock(): Promise<void> {
    await lock(this.lockPath, {
      retries: 10,
      wait: 1000,
      pollPeriod: 100,
    });
  }

  async unlock(): Promise<void> {
    await unlock(this.lockPath);
  }

  async enqueue(item: QueueItem) {
    await this.lock();
    let queue = await this.read();
    let position = queue.length;
    let newQueue = [...queue, validate(item)];
    await this.write(newQueue);
    await this.unlock();
    return position;
  }

  async updateItem(pullRequestId: string, buildId: string) {
    await this.lock();
    let queue = await this.read();
    let newQueue = queue.map(item => {
      if (item.pullRequestId === pullRequestId) {
        return { ...item, buildId };
      } else {
        return item;
      }
    });
    await this.write(newQueue);
    await this.unlock();
  }

  async dequeue(): Promise<QueueItem> {
    await this.lock();
    let queue = await this.read();
    let [item, ...newQueue] = queue;
    await this.write(newQueue);
    await this.unlock();
    return item;
  }

  async remove(pullRequestId: string) {
    await this.lock();
    let queue = await this.read();
    let match = queue.find(item => item.pullRequestId === pullRequestId);
    let newQueue = queue.filter(item => item.pullRequestId !== pullRequestId);
    await this.write(newQueue);
    await this.unlock();
    return !!match;
  }
}
