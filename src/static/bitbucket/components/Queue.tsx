import { css, keyframes } from 'emotion';
import { G300, N60, N200, N400 } from '@atlaskit/theme/colors';
import { QueueResponse } from './types';

const queueContainerStyle = css({
  display: 'flex',
  flexDirection: 'row',
});

const queueElementStyle = {
  width: 20,
  height: 20,
  background: 'rgb(94 108 132 / 22%)',
  borderRadius: '50%',
  marginRight: 6,
  fontSize: 10,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const queueElementInactiveStyle = css({
  ...queueElementStyle,
  background: 'rgb(94 108 132 / 22%)',
  color: N60,
});

const queueElementActiveStyle = css({
  ...queueElementStyle,
  background: G300,
  color: 'white',
  boxShadow: `0px 0px 0px 2px white, 0px 0px 0px 3px ${G300}`,
});

const shimmer = keyframes({
  from: {
    background: N200,
  },
  to: {
    background: N400,
  },
});

const queueElementRunningStyle = css({
  ...queueElementStyle,
  animation: `${shimmer} 0.5s alternate infinite`,
});

const queueSeparatorStyle = css({
  width: 2,
  height: 20,
  background: N60,
  marginRight: 14,
  marginLeft: 8,
});

const queueLabelStyle = css({
  marginTop: 6,
  marginBottom: 6,
});

const Queue = ({
  queue,
  pullRequestId,
}: {
  queue: QueueResponse['queue'] | undefined;
  pullRequestId: number;
}) => {
  if (!queue) {
    return null;
  }
  const waitingQueue = queue.filter((request) => request.state === 'queued');
  const runningQueue = queue.filter((request) => request.state === 'running');

  const prPositionWaitQueue = waitingQueue.findIndex(
    (pr) => pr.request.pullRequestId === pullRequestId,
  );
  const prPositionRunningQueue = runningQueue.findIndex(
    (pr) => pr.request.pullRequestId === pullRequestId,
  );

  const isPRInWaitQueue = prPositionWaitQueue > -1;
  const isPRInRunningQueue = prPositionRunningQueue > -1;
  const isPRInQueue = isPRInWaitQueue || isPRInRunningQueue;

  const totalWaiting = waitingQueue.length;
  const totalRunning = runningQueue.length;

  if (!isPRInQueue) {
    return <div> Pull request is no longer in queue. </div>;
  }

  return (
    <>
      <div className={queueContainerStyle}>
        {totalRunning > 1 &&
          [...new Array(totalRunning).keys()].map((_, index) => (
            <div
              key={index}
              className={
                isPRInRunningQueue && index === prPositionRunningQueue
                  ? queueElementActiveStyle
                  : queueElementRunningStyle
              }
            ></div>
          ))}
        {totalWaiting > 0 && <div className={queueSeparatorStyle} />}
        {[...new Array(totalWaiting).keys()].map((_, index) => (
          <div
            key={index}
            className={
              isPRInWaitQueue && index === prPositionWaitQueue
                ? queueElementActiveStyle
                : queueElementInactiveStyle
            }
          >
            {index + 1}
          </div>
        ))}
      </div>
      {isPRInWaitQueue ? (
        prPositionWaitQueue === 0 ? (
          <div className={queueLabelStyle}>Land request is waiting at start of the queue...</div>
        ) : (
          <div className={queueLabelStyle}>
            {' '}
            Land request is behind {prPositionWaitQueue} other requests...
          </div>
        )
      ) : null}
      {isPRInRunningQueue && (
        <div className={queueLabelStyle}>
          Build checks are being run for this pull request. If they succeed, the pull request will
          be merged.{' '}
        </div>
      )}
    </>
  );
};

export default Queue;
