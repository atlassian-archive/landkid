/**
 * Taken from the PR we have created to p-wait-for. Would be great to move to that if it get merged
 * https://github.com/sindresorhus/p-wait-for/pull/1/
 */

'use strict';
module.exports = (condition, interval, timeout) =>
  new Promise((resolve, reject) => {
    interval = typeof interval === 'number' ? interval : 20;

    let timedOut = false;
    let timer;

    if (typeof timeout === 'number') {
      timer = setTimeout(() => {
        timedOut = true;
        reject(
          new Error('Expected condition to resolve within ' + timeout + 'ms')
        );
      }, timeout);
    }

    const check = () => {
      Promise.resolve()
        .then(condition)
        .then(val => {
          if (typeof val !== 'boolean') {
            throw new TypeError('Expected condition to return a boolean');
          }

          if (timedOut) {
            return;
          }

          if (val === true) {
            clearTimeout(timer);
            resolve();
          } else {
            setTimeout(check, interval);
          }
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
        });
    };

    check();
  });
