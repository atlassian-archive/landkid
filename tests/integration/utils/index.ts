import { string, array } from 'joi';
import type { ArraySchema } from 'joi';

const queued = string().only('queued');
const running = string().only('running');
const merging = string().only('merging');
const fail = string().only('fail');
const success = string().only('success');

const successfulFlow = [queued, running, merging, success];
const failedFlow = [queued, running, fail];
const failedDepFlow = [queued, running, fail];

export const successful = array().ordered(...successfulFlow);
export const failed = array().ordered(...failedFlow);
export const reentryFail = array().ordered(...failedDepFlow, ...failedFlow);
export const doubleReentrySuccess = array().ordered(
  ...failedDepFlow,
  ...failedDepFlow,
  ...successfulFlow,
);

// Including the `awaiting-merge` status check introduced flakiness
// because of Bitbucket build times, merge times, and other factors
export const validate = (statuses: string[], schema: ArraySchema) => {
  return schema.validate(statuses.filter((status) => status !== 'awaiting-merge'));
};
