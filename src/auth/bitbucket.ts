import axios from 'axios';
import * as passport from 'passport';
import { Strategy, VerifyCallback } from 'passport-oauth2';
import { Logger } from '../lib/Logger';
import { config } from '../lib/Config';

export function initializePassport() {
  passport.deserializeUser<ISessionUser, string>((serialized, done) => {
    done(null, JSON.parse(serialized));
  });

  passport.serializeUser<ISessionUser, string>((user, done) => {
    done(null, JSON.stringify(user));
  });

  passport.use(
    'bitbucket',
    new Strategy(
      {
        authorizationURL: 'https://bitbucket.org/site/oauth2/authorize',
        tokenURL: 'https://bitbucket.org/site/oauth2/access_token',
        callbackURL: `${config.baseUrl}/auth/callback`,
        clientID: 'gxGvB4RZtx2uKYL96j',
        clientSecret: 'SzDE73T3ELFwYNff8BHXj7RcJhpG84rL',
      },
      async (
        accessToken: string,
        refreshToken: string,
        results: any,
        profile: any,
        verified: VerifyCallback,
      ) => {
        let userInfo: ISessionUser;
        try {
          const userResponse = await axios.get(
            'https://api.bitbucket.org/2.0/user',
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          );

          userInfo = {
            aaid: userResponse.data.account_id,
            username: userResponse.data.username,
            displayName: userResponse.data.display_name,
          };

          Logger.info('User logged in', { userInfo });
        } catch (err) {
          return verified(err);
        }

        verified(null, userInfo);
      },
    ),
  );
}
