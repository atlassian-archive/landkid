import Client from '../Client';

export default function onStatus(client: Client, body: any) {
  return client.processStatusWebhook(body);
}
