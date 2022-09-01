import { encode, createQueryStringHash } from 'atlassian-jwt';
import type { Request } from 'atlassian-jwt';
import { AxiosRequestConfig } from 'axios';

import { Installation } from '../db';
import { getAppKey } from './descriptor';
import { Logger } from '../lib/Logger';

class BitbucketAuthenticator {
  private getBasicAuthHeaders = () => {
    // If we aren't installed, requests should be unauthenticated
    return {};
  };

  private getJWTAuthHeaders = (request: Request, install: Installation) => {
    const token = encode(
      {
        iss: getAppKey(),
        iat: Date.now(),
        exp: Date.now() + 60000,
        qsh: createQueryStringHash(request),
        sub: install.clientKey,
      },
      install.sharedSecret,
    );
    Logger.info('Generated JWT', { namespace: 'bitbucket:authenticator:getJWTAuthHeaders' });
    return {
      Authorization: `JWT ${token}`,
    };
  };

  getAuthConfig = async (
    request: Request,
    baseConfig?: AxiosRequestConfig,
  ): Promise<AxiosRequestConfig> => {
    const install = await Installation.findOne<Installation>();
    let authHeaders: any;
    if (!install) {
      Logger.info('no install, using basic auth', {
        namespace: 'bitbucket:authenticator:getJWTAuthHeaders',
      });
      authHeaders = this.getBasicAuthHeaders();
    } else {
      Logger.info('found install, using JWT auth', {
        namespace: 'bitbucket:authenticator:getJWTAuthHeaders',
      });
      authHeaders = this.getJWTAuthHeaders(request, install);
    }

    return {
      ...baseConfig,
      headers: { ...(baseConfig ? baseConfig.headers || {} : {}), ...authHeaders },
    };
  };
}

export const bitbucketAuthenticator = new BitbucketAuthenticator();

export const axiosPostConfig: AxiosRequestConfig = {
  headers: {
    'Content-Type': 'application/json',
  },
};
