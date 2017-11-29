// @flow
import BaseModel from './models/BaseModel';

export default class Queue {
  client: Object;

  constructor(client: Object) {
    this.client = client;
  }

  async list(name: string) {
    let items = await this.client.lrangeAsync(name, 0, -1);
    return items.map(item => JSON.parse(item));
  }

  async enqueue(name: string, model: BaseModel) {
    return await this.client.rpushAsync(name, JSON.stringify(model));
  }

  async dequeue(name: string): Promise<JSONValue> {
    return JSON.parse(await this.client.lpopAsync(name));
  }
}
