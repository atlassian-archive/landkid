import * as express from 'express';
import * as passport from 'passport';
import { permissionService } from '../../lib/PermissionService';
import { wrap } from '../middleware';

export function authRoutes() {
  const router = express();

  router.get('/', passport.authenticate('bitbucket'));
  router.get('/callback', passport.authenticate('bitbucket', { failureRedirect: '/auth' }), (req, res) => {
    res.redirect('/current-state');
  });

  router.get(
    '/whoami',
    wrap(async (req, res) => {
      res.json({
        loggedIn: !!req.user,
        user: req.user,
        permission: req.user ? await permissionService.getPermissionForUser(req.user.aaid) : 'read',
      });
    }),
  );

  return router;
}
