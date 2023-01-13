import axios from 'axios';
import passport from 'passport';
import { BasicStrategy } from 'passport-http';
import { Strategy, VerifyCallback } from 'passport-oauth2';
import { Logger } from '../lib/Logger';
import { config } from '../lib/Config';
import { OAuthConfig } from '../types';

async function verifyBitbucketUser(
  authHeader: string,
  verified: (err?: Error | null, user?: Express.User) => void,
) {
  let userInfo: ISessionUser;
  try {
    const userResponse = await axios.get('https://api.bitbucket.org/2.0/user', {
      headers: {
        Authorization: authHeader,
      },
    });

    userInfo = {
      aaid: userResponse.data.uuid,
      username: userResponse.data.username,
      displayName: userResponse.data.display_name,
      accountId: userResponse.data.account_id,
    };

    Logger.info('User logged in', {
      namespace: 'auth:bitbucket',
      aaid: userInfo.aaid,
    });
  } catch (err) {
    return verified(err);
  }

  verified(null, userInfo);
}

export function initializePassport(oAuthConfig: OAuthConfig) {
  passport.serializeUser<string>((user, done) => {
    done(null, JSON.stringify(user));
  });

  passport.deserializeUser<string>((serialized, done) => {
    done(null, JSON.parse(serialized));
  });

  // Bitbucket OAuth2
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
      (accessToken: string, refreshToken: string, profile: any, verified: VerifyCallback) => {
        verifyBitbucketUser(`Bearer ${accessToken}`, verified);
      },
    ),
  );

  // Allow programmatic Bitbucket login for tests
  passport.use(
    'basic',
    new BasicStrategy((username, password, done) => {
      const token = Buffer.from(`${username}:${password}`).toString('base64');
      verifyBitbucketUser(`Basic ${token}`, done);
    }),
  );
}
