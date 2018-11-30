import * as jwtTools from 'atlassian-jwt';
import { AxiosRequestConfig } from 'axios';

import { Installation } from '../db';
import { getAppKey } from './descriptor';
import { Logger } from '../lib/Logger';

class BitbucketAuthenticator {
  private getBasicAuthHeaders = () => {
    // If we aren't installed, requests should be unauthenticated
    return {};
  };

  private getJWTAuthHeaders = (request: jwtTools.Request, install: Installation) => {
    const token = jwtTools.encode(
      {
        iss: getAppKey(),
        iat: Date.now(),
        exp: Date.now() + 60000,
        qsh: jwtTools.createQueryStringHash(request),
        sub: install.clientKey,
      },
      install.sharedSecret,
    );
    Logger.info('Generated JWT:', { token });
    return {
      Authorization: `JWT ${token}`,
    };
  };

  getAuthConfig = async (
    request: jwtTools.Request,
    baseConfig?: AxiosRequestConfig,
  ): Promise<AxiosRequestConfig> => {
    const install = await Installation.findOne<Installation>();
    let authHeaders: any;
    if (!install) {
      Logger.info('no install, using basic auth');
      authHeaders = this.getBasicAuthHeaders();
    } else {
      Logger.info('found install, using JWT auth');
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
