// @flow
import { type Env, type JSONValue } from '../types';
import Runner from '../Runner';
import Client from '../Client';

export default function onStatus(
  client: Client,
  body: JSONValue,
  runner: Runner
) {
  return client.processStatusWebhook(body);
}
