import { client } from './utils/redis-client';

import { promisify } from 'util';
import { withLock } from './utils/locker';
import { BitbucketClient } from '../bitbucket/BitbucketClient';

const getAsync: (key: string) => Promise<string | undefined> = promisify(
  client.get,
).bind(client);
const setAsync: (key: string, value: string) => Promise<void> = promisify(
  client.set,
).bind(client);

let instance: AccountService | null = null;

export class AccountService {
  static KEY_PREFIX = 'account-service-v1';

  static get(client: BitbucketClient) {
    if (!instance) {
      instance = new AccountService(client);
    }
    return instance;
  }

  constructor(private client: BitbucketClient) {}

  private key = (suffix: string) => `${AccountService.KEY_PREFIX}:${suffix}`;
  private resource = (suffix: string) => `resource:${this.key(suffix)}`;

  private loadAccountInfo = (aaid: string): Promise<ISessionUser> => {
    return this.client.bitbucket.getUser(aaid);
  };

  public getAccountInfo = async (aaid: string): Promise<ISessionUser> => {
    return await withLock(
      this.resource(aaid),
      async (): Promise<ISessionUser> => {
        const cached = await getAsync(this.key(aaid));
        if (!cached) {
          const accountInfo = await this.loadAccountInfo(aaid);
          await setAsync(this.key(aaid), JSON.stringify(accountInfo));
          return accountInfo;
        }

        return JSON.parse(cached);
      },
    );
  };
}
