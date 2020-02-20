import Joi from 'joi';

const queued = Joi.string().valid('queued');
const running = Joi.string().valid('running');
const awaitingmerge = Joi.string().valid('awaitingmerge');
const fail = Joi.string().valid('fail');
const success = Joi.string().valid('success');

export const successful = Joi.array().ordered(queued, running, awaitingmerge, success);

export const failed = Joi.array().ordered(queued, running, fail);

export const reentry = Joi.array().ordered(
  queued,
  running,
  awaitingmerge.optional(),
  fail,
  queued,
  running,
  awaitingmerge,
  success,
);

export const doubleReentry = Joi.array().ordered(
  queued,
  running,
  awaitingmerge.optional(),
  fail,
  queued,
  running,
  awaitingmerge.optional(),
  fail,
  queued,
  running,
  awaitingmerge,
  success,
);
