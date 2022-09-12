import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';

import '@atlaskit/css-reset';

import { proxyRequest, proxyRequestBare } from '../utils/RequestProxy';

import Message from './Message';
import Timeout = NodeJS.Timeout;
import { LoadStatus, QueueResponse, Status } from './types';

type BannerMessage = {
  messageExists: boolean;
  message: string;
  messageType: 'default' | 'warning' | 'error';
};

type LandState =
  | 'will-queue-when-ready'
  | 'queued'
  | 'running'
  | 'awaiting-merge'
  | 'merging'
  | 'success'
  | 'fail'
  | 'aborted';

type CanLandResponse = {
  canLand: boolean;
  canLandWhenAble: boolean;
  errors: string[];
  warnings: string[];
  bannerMessage: BannerMessage | null;
  state: LandState | null;
};

const initialState: CanLandResponse = {
  canLand: false,
  canLandWhenAble: false,
  errors: [],
  warnings: [],
  bannerMessage: null,
  state: null,
};

const qs = new URLSearchParams(window.location.search);
const appName = qs.get('appName') || 'Landkid';

const App = () => {
  const [status, setStatus] = useState<Status | undefined>();
  const [queue, setQueue] = useState<QueueResponse | undefined>();
  const [loadStatus, setLoadStatus] = useState<LoadStatus>(() => {
    return 'not-loaded';
  });
  const [state, dispatch] = useState(initialState);

  const { ref, inView } = useInView({
    threshold: 0,
    onChange: (inViewUpdated) => {
      if (inViewUpdated && !document.hidden) {
        checkIfAbleToLand();
      }
    },
  });

  let refreshTimeoutId: Timeout;

  const pollAbleToLand = () => {
    const isVisible = !document.hidden;
    let refreshIntervalMs = inView ? 5000 : 15000;
    const checkPromise = isVisible ? checkIfAbleToLand() : Promise.resolve();

    checkPromise.finally(() => {
      if (status == 'pr-closed') return;
      refreshTimeoutId = setTimeout(() => {
        pollAbleToLand();
      }, refreshIntervalMs);
    });
  };

  let isInitialLoaded: boolean;

  useEffect(() => {
    isInitialLoaded = false;
    pollAbleToLand();

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && inView) {
        checkIfAbleToLand();
      }
    });

    return () => {
      clearTimeout(refreshTimeoutId);
    };
  }, []);

  const checkQueueStatus = () => {
    proxyRequestBare<any>('/queue', 'POST')
      .then((res) => {
        setQueue(res);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const checkIfAbleToLand = async () => {
    setLoadStatus(() => (isInitialLoaded ? 'refreshing' : 'loading'));
    isInitialLoaded = true;

    const isOpen = qs.get('state') === 'OPEN';
    if (!isOpen) {
      setStatus('pr-closed');
      return;
    }

    return proxyRequest<CanLandResponse>('/can-land', 'POST')
      .then(({ canLand, canLandWhenAble, errors, warnings, bannerMessage, state }) => {
        switch (state) {
          case 'queued':
            checkQueueStatus();
          case 'will-queue-when-ready':
          case 'running':
          case 'awaiting-merge':
          case 'merging':
            setStatus(state);
            break;
          default:
            setStatus(canLand ? 'can-land' : 'cannot-land');
        }

        dispatch({
          canLand,
          canLandWhenAble,
          state,
          errors,
          warnings,
          bannerMessage,
        });
        setLoadStatus('loaded');
      })
      .catch((err) => {
        setLoadStatus('loaded');
        console.error(err);
        if (err?.code === 'USER_DENIED_ACCESS' || err?.code === 'USER_ALREADY_DENIED_ACCESS') {
          setStatus('user-denied-access');
        } else {
          setStatus('unknown-error');
        }
        setLoadStatus('loaded');
      });
  };

  const onLandClicked = () => {
    setLoadStatus('queuing');
    proxyRequest('/land', 'POST')
      .then(() => {
        checkIfAbleToLand();
        setStatus('queued');
      })
      .catch((err) => {
        checkIfAbleToLand();
        console.error(err);
        setStatus('unknown-error');
      });
  };

  const onLandWhenAbleClicked = () => {
    setLoadStatus('queuing');
    proxyRequest('/land-when-able', 'POST')
      .then(() => {
        setLoadStatus('loaded');
        checkIfAbleToLand();
      })
      .catch((err) => {
        setLoadStatus('loaded');
        console.error(err);
        setStatus('unknown-error');
      });
  };

  const onCheckAgainClicked = () => {
    checkIfAbleToLand();
  };

  return (
    <div
      style={{
        paddingBottom: 20,
      }}
      ref={ref}
    >
      <Message
        loadStatus={loadStatus}
        appName={appName}
        queue={queue}
        status={status}
        canLandWhenAble={state.canLandWhenAble}
        errors={state.errors}
        warnings={state.warnings}
        bannerMessage={state.bannerMessage}
        onCheckAgainClicked={onCheckAgainClicked}
        onLandWhenAbleClicked={onLandWhenAbleClicked}
        onLandClicked={onLandClicked}
      />
    </div>
  );
};

export default App;
