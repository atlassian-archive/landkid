import { css, keyframes } from 'emotion';
import { G300, N60, N300, N400 } from '@atlaskit/theme/colors';
import { proxyRequest } from '../utils/RequestProxy';
import { RunnerState } from '../../../types';
import { useEffect, useState } from 'react';

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
    background: N300,
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

type LoadingState = 'not-loaded' | 'loading' | 'refreshing' | 'error' | 'loaded';

const useQueueResults = () => {
  const [loadingState, setLoadingState] = useState<LoadingState>('not-loaded');
  const [currentState, setCurrentState] = useState<Pick<RunnerState, 'queue' | 'waitingToQueue'>>({
    queue: [],
    waitingToQueue: [],
  });

  const fetchCurrentState = () => {
    setLoadingState(loadingState === 'not-loaded' ? 'loading' : 'refreshing');
    proxyRequest<RunnerState>('/current-state', 'GET')
      .then(({ queue, waitingToQueue }) => {
        setLoadingState('loaded');
        setCurrentState({ queue, waitingToQueue });
      })
      .catch((err) => {
        console.error('Failed to fetch PR status', err);
        setLoadingState('error');
      });
  };

  let intervalId: any;
  useEffect(() => {
    fetchCurrentState();
    intervalId = setInterval(() => {
      if (!document.hidden) {
        fetchCurrentState();
      }
    }, 10000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return {
    loadingState,
    currentState,
  };
};

export const QueueBase = ({
  loadingState,
  currentState,
  currentPullRequestId,
}: {
  loadingState: LoadingState;
  currentState: Pick<RunnerState, 'queue' | 'waitingToQueue'>;
  currentPullRequestId: number;
}) => {
  const prPositionWaitQueue = currentState.waitingToQueue.findIndex(
    (pr) => pr.request.pullRequestId === currentPullRequestId,
  );
  const prPositionRunningQueue = currentState.queue.findIndex(
    (pr) => pr.request.pullRequestId === currentPullRequestId,
  );

  console.log({ loadingState, currentState, currentPullRequestId });
  console.log({ prPositionWaitQueue, prPositionRunningQueue });
  const isPRInWaitQueue = prPositionWaitQueue > -1;
  const isPRInRunningQueue = prPositionRunningQueue > -1;
  const isPRInQueue = isPRInWaitQueue || isPRInRunningQueue;

  const totalWaiting = currentState.waitingToQueue.length;
  const totalRunning = currentState.queue.length;

  if (loadingState === 'error') {
    return <div>Failed to fetch queue.</div>;
  }

  if (loadingState === 'loading' || loadingState === 'not-loaded') {
    return <div>Loading...</div>;
  }

  if (!isPRInQueue) {
    return <div> Pull request is no longer in queue. </div>;
  }

  return (
    <>
      <div className={queueContainerStyle}>
        {[...new Array(totalRunning).keys()].map((_, index) => (
          <div
            key={index}
            className={
              isPRInRunningQueue && index === prPositionRunningQueue
                ? queueElementActiveStyle
                : queueElementRunningStyle
            }
          ></div>
        ))}
        <div className={queueSeparatorStyle}></div>
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
          <div className={queueLabelStyle}>Land request is waiting at start of the queue</div>
        ) : (
          <div className={queueLabelStyle}>
            {' '}
            Land request is behind {prPositionWaitQueue} other land requests...
          </div>
        )
      ) : null}
      {isPRInRunningQueue && (
        <div className={queueLabelStyle}>Land request is currently being built...</div>
      )}
    </>
  );
};

const Queue = () => {
  const { loadingState, currentState } = useQueueResults();
  const qs = new URLSearchParams(window.location.search);
  const pullRequestId = parseInt(qs.get('pullRequestId') || '');

  return (
    <QueueBase
      currentState={currentState}
      loadingState={loadingState}
      currentPullRequestId={pullRequestId}
    />
  );
};

export default Queue;
