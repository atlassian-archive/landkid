import axios from 'axios';
import * as passport from 'passport';
import { Strategy, VerifyCallback } from 'passport-oauth2';
import { Logger } from '../lib/Logger';
import { config } from '../lib/Config';
import { OAuthConfig } from '../types';

export function initializePassport(oAuthConfig: OAuthConfig) {
  passport.serializeUser<string>((user, done) => {
    done(null, JSON.stringify(user));
  });

  passport.deserializeUser<string>((serialized, done) => {
    done(null, JSON.parse(serialized));
  });

  passport.use(
    'bitbucket',
    new Strategy(
      {
        authorizationURL: 'https://bitbucket.org/site/oauth2/authorize',
        tokenURL: 'https://bitbucket.org/site/oauth2/access_token',
        callbackURL: `${config.baseUrl}/auth/callback`,
        clientID: oAuthConfig.key,
        clientSecret: oAuthConfig.secret,
      },
      async (accessToken: string, refreshToken: string, profile: any, verified: VerifyCallback) => {
        let userInfo: ISessionUser;
        try {
          const userResponse = await axios.get('https://api.bitbucket.org/2.0/user', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          userInfo = {
            aaid: userResponse.data.uuid,
            username: userResponse.data.username,
            displayName: userResponse.data.display_name,
          };

          Logger.info('User logged in', {
            namespace: 'auth:bitbucket',
            aaid: userInfo.aaid,
          });
        } catch (err) {
          return verified(err);
        }

        verified(null, userInfo);
      },
    ),
  );
}
