// @flow
import { type Env, type JSONValue } from '../types';

export default async function onStatus(env: Env, body: JSONValue) {
  let statusEvent = env.ci.processStatusWebhook(body);
  // ...
}
