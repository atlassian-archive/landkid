import * as express from 'express';
import * as jwtTools from 'atlassian-jwt';
import { Installation } from '../db';
import { permissionService } from '../lib/PermissionService';
import { Logger } from '../lib/Logger';

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

export const requireAuth = (mode: IPermissionMode = 'read'): express.RequestHandler =>
  wrap(async (req, res, next) => {
    if (!req.user) {
      Logger.warn('Endpoint requires authentication', {
        namespace: 'routes:middleware:requireAuth',
      });
      return res.status(401).json({
        error: 'This endpoint requires authentication',
      });
    }

    const userMode = await permissionService.getPermissionForUser(req.user.aaid);

    if (!permission(userMode).isAtLeast(mode)) {
      return res.status(403).json({
        error: 'You are not powerful enough to use this endpoint, sorry not sorry...',
      });
    }

    next();
  });

export const authenticateIncomingBBCall: express.RequestHandler = wrap(async (req, res, next) => {
  const install = await Installation.findOne<Installation>();
  if (!install) {
    Logger.error('Addon has not been installed, can not be validated', {
      namespace: 'routes:middleware:authenticateIncomingBBCall',
    });
    return res.status(401).json({
      error: 'Addon has not been installed, can not be validated',
    });
  }
  let jwt: string | undefined = req.query.jwt || req.header('authorization');
  if (!jwt) {
    Logger.error('Authenticated request requires a JWT token', {
      namespace: 'routes:middleware:authenticateIncomingBBCall',
    });
    return res.status(401).json({
      error: 'Authenticated request requires a JWT token',
    });
  }
  if (jwt.startsWith('JWT ')) {
    jwt = jwt.substr(4);
  }

  let decoded: any;
  try {
    decoded = jwtTools.decode(jwt, install.sharedSecret);
  } catch (err) {
    Logger.error('Could not validate JWT', {
      namespace: 'routes:middleware:authenticateIncomingBBCall',
    });
    return res.status(401).json({
      error: 'Could not validate JWT',
    });
  }

  if (!decoded || !decoded.qsh || decoded.iss !== install.clientKey) {
    return res.status(401).json({
      error: 'That JWT is pretty bad lol',
    });
  }

  const expectedHash = jwtTools.createQueryStringHash(jwtTools.fromExpressRequest(req));

  if (expectedHash !== decoded.qsh) {
    Logger.error('JWT token is valid but not for this request', {
      namespace: 'routes:middleware:authenticateIncomingBBCall',
    });
    return res.status(401).json({
      error: 'JWT token is valid but not for this request',
    });
  }

  next();
});
