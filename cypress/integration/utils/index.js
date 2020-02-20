import Joi from 'joi';

const queued = Joi.string().valid('queued');
const running = Joi.string().valid('running');
const awaitingmerge = Joi.string().valid('awaitingmerge');
const fail = Joi.string().valid('fail');
const success = Joi.string().valid('success');

const successfulFlow = [queued, running, awaitingmerge, success];
const failedFlow = [queued, running, fail];
const failedDepFlow = [queued, running, awaitingmerge.optional(), fail];

export const successful = Joi.array().ordered(...successfulFlow);
export const failed = Joi.array().ordered(...failedFlow);
export const reentry = Joi.array().ordered(...failedDepFlow, ...successfulFlow);
export const doubleReentry = Joi.array().ordered(
  ...failedDepFlow,
  ...failedDepFlow,
  ...successfulFlow,
);
