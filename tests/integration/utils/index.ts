import * as Joi from 'joi';

const queued = Joi.string().valid('queued');
const running = Joi.string().valid('running');
const awaitingmerge = Joi.string().valid('awaitingmerge');
const merging = Joi.string().valid('merging');
const fail = Joi.string().valid('fail');
const success = Joi.string().valid('success');

const successfulFlow = [queued, running, awaitingmerge, merging, success];
const failedFlow = [queued, running, fail];
const failedDepFlow = [queued, running, awaitingmerge.optional(), fail];

export const successful = Joi.array().ordered(...successfulFlow);
export const failed = Joi.array().ordered(...failedFlow);
export const reentryFail = Joi.array().ordered(...failedDepFlow, ...failedFlow);
export const doubleReentrySuccess = Joi.array().ordered(
  ...failedDepFlow,
  ...failedDepFlow,
  ...successfulFlow,
);
