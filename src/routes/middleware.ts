import * as express from 'express';
import * as jwtTools from 'atlassian-jwt';
import { Installation } from '../db';
import { permissionService } from '../lib/PermissionService';

export const wrap = (fn: express.RequestHandler): express.RequestHandler => {
  return async (req, res, next) => {
    try {
      await Promise.resolve(fn(req, res, next));
    } catch (err) {
      next(err);
    }
  };
};

const modeHierarchy: IPermissionMode[] = ['read', 'land', 'admin'];

export const permission = (userMode: IPermissionMode) => ({
  isAtLeast: (mode: IPermissionMode) =>
    modeHierarchy.indexOf(userMode) >= modeHierarchy.indexOf(mode),
});

export const requireAuth = (
  mode: IPermissionMode = 'read',
): express.RequestHandler =>
  wrap(async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'This endpoint requires authentication',
      });
    }

    const userMode = await permissionService.getPermissionForUser(
      req.user.aaid,
    );

    if (!permission(userMode).isAtLeast(mode)) {
      return res.status(403).json({
        error: 'You are not powerful enough to use this endpoint, sorry...',
      });
    }

    next();
  });

export const authenticateIncomingBBCall: express.RequestHandler = wrap(
  async (req, res, next) => {
    const install = await Installation.findOne<Installation>();
    if (!install) {
      return res.status(401).json({
        error: 'Addon has not been installed, can not be validated',
      });
    }
    let jwt: string | undefined = req.query.jwt || req.header('authorization');
    if (!jwt) {
      return res.status(401).json({
        error: 'No JWT, please provide one m8y',
      });
    }
    if (jwt.startsWith('JWT ')) {
      jwt = jwt.substr(4);
    }

    let decoded: any;
    try {
      decoded = jwtTools.decode(jwt, install.sharedSecret);
    } catch (err) {
      return res.status(401).json({
        error: 'Could not validate JWT',
      });
    }

    if (!decoded || !decoded.qsh || decoded.iss !== install.clientKey) {
      return res.status(401).json({
        error: 'That JWT is pretty bad lol',
      });
    }

    const expectedHash = jwtTools.createQueryStringHash(
      jwtTools.fromExpressRequest(req),
    );

    if (expectedHash !== decoded.qsh) {
      return res.status(401).json({
        error: 'Well, you got quite far, but you are as bad as luke',
      });
    }

    next();
  },
);
