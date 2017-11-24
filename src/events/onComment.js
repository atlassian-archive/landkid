// @flow
import { type Env, type JSONValue, type CommandName } from '../types';
import commands from '../commands';

function toCommandName(commentBody: string): CommandName | null {
  return 'help';
}

export default async function onComment(env: Env, body: JSONValue) {
  let commentEvent = env.host.processCommentWebhook(body);
  let commandName = toCommandName(commentEvent.commentBody);
  if (!commandName) return;
  let command = commands[commandName];
  if (!command) throw new Error(`Invalid command: ${commandName}`);
  await command(env, commentEvent);
}
