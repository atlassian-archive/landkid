import * as Joi from 'joi';

const queued = Joi.string().only('queued');
const running = Joi.string().only('running');
const merging = Joi.string().only('merging');
const fail = Joi.string().only('fail');
const success = Joi.string().only('success');

const successfulFlow = [queued, running, merging, success];
const failedFlow = [queued, running, fail];
const failedDepFlow = [queued, running, fail];

export const successful = Joi.array().ordered(...successfulFlow);
export const failed = Joi.array().ordered(...failedFlow);
export const reentryFail = Joi.array().ordered(...failedDepFlow, ...failedFlow);
export const doubleReentrySuccess = Joi.array().ordered(
  ...failedDepFlow,
  ...failedDepFlow,
  ...successfulFlow,
);

// Including the `awaiting-merge` status check introduced flakiness
// because of Bitbucket build times, merge times, and other factors
export const validate = (statuses: string[], schema: Joi.ArraySchema) => {
  return schema.validate(statuses.filter(status => status !== 'awaiting-merge'));
};
