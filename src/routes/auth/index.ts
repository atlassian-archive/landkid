import express from 'express';
import passport from 'passport';
import { permissionService } from '../../lib/PermissionService';
import { wrap } from '../middleware';
import { Logger } from '../../lib/Logger';
import { Config } from '../../types';

export function authRoutes(config: Config) {
  const router = express();

  const authStrategies = config.deployment.enableBasicAuth ? ['basic', 'bitbucket'] : 'bitbucket';

  router.get('/', passport.authenticate(authStrategies), (req, res) => {
    res.redirect('/current-state');
  });

  router.get(
    '/callback',
    passport.authenticate('bitbucket', { failureRedirect: '/auth' }),
    (req, res) => {
      res.redirect('/current-state');
    },
  );

  router.get(
    '/whoami',
    wrap(async (req, res) => {
      Logger.verbose('Requesting whoami', { namespace: 'routes:auth:whoami', user: req.user });
      res.json({
        loggedIn: !!req.user,
        user: req.user,
        permission: req.user ? await permissionService.getPermissionForUser(req.user.aaid) : 'read',
      });
    }),
  );

  return router;
}
