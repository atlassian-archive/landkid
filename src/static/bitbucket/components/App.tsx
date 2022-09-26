import { useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import useState from 'react-usestateref';

import '@atlaskit/css-reset';

import { proxyRequest, proxyRequestBare } from '../utils/RequestProxy';

import Message from './Message';
import Timeout = NodeJS.Timeout;
import { LoadStatus, QueueResponse, Status } from './types';
import getWidgetSettings from '../utils/getWidgetSettings';
import { WidgetSettings } from '../../../types';

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
const pullRequestId = parseInt(qs.get('pullRequestId') || '');
const repoName = qs.get('repoName') || '';

const App = () => {
  const [status, setStatus, statusRef] = useState<Status | undefined>();
  const [queue, setQueue] = useState<QueueResponse['queue'] | undefined>();
  const [_, setLoadStatus, loadStatusRef] = useState<LoadStatus>('not-loaded');
  const [state, dispatch] = useState(initialState);

  const { ref, inView } = useInView({
    threshold: 0,
    onChange: (inViewUpdated) => {
      inViewRef.current = inViewUpdated;
      if (inViewUpdated && !document.hidden) {
        checkIfAbleToLand();
      }
    },
  });

  const inViewRef = useRef(inView);
  inViewRef.current = inView;

  let refreshTimeoutId: Timeout;

  // If only refreshing when in viewport, uses `refreshInterval`,
  // Else uses `refreshInterval` when in viewport and twice the timeout when not in viewport
  const getRefreshInterval = (widgetSettings: WidgetSettings) => {
    if (widgetSettings.refreshOnlyWhenInViewport) {
      return widgetSettings.refreshInterval;
    } else {
      return inViewRef.current
        ? widgetSettings.refreshInterval
        : widgetSettings.refreshInterval * 2;
    }
  };

  const pollAbleToLand = () => {
    const widgetSettings = getWidgetSettings();
    const isVisible =
      !document.hidden && (widgetSettings.refreshOnlyWhenInViewport ? inViewRef.current : true);

    let refreshIntervalMs = getRefreshInterval(widgetSettings);

    const checkPromise = isVisible ? checkIfAbleToLand() : Promise.resolve();

    checkPromise.finally(async () => {
      if (statusRef.current == 'pr-closed') return;
      refreshTimeoutId = setTimeout(() => {
        pollAbleToLand();
      }, refreshIntervalMs);
    });
  };

  useEffect(() => {
    pollAbleToLand();

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && inViewRef.current) {
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
        setQueue(res.queue);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const checkIfAbleToLand = async () => {
    const isOpen = qs.get('state') === 'OPEN';
    if (!isOpen) {
      setStatus('pr-closed');
      return;
    }

    if (loadStatusRef.current === 'loading' || loadStatusRef.current === 'refreshing') return;
    setLoadStatus(loadStatusRef.current === 'not-loaded' ? 'loading' : 'refreshing');

    return proxyRequest<CanLandResponse>('/can-land', 'POST')
      .then(({ canLand, canLandWhenAble, errors, warnings, bannerMessage, state }) => {
        switch (state) {
          case 'running':
          case 'queued':
            checkQueueStatus();
          case 'will-queue-when-ready':
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
        setStatus('queued');
        checkQueueStatus();
        checkIfAbleToLand();
      })
      .catch((err) => {
        checkQueueStatus();
        checkIfAbleToLand();
        console.error(err);
        setStatus('unknown-error');
      });
  };

  const onLandWhenAbleClicked = () => {
    setLoadStatus('queuing');
    proxyRequest('/land-when-able', 'POST')
      .then(() => {
        setStatus('will-queue-when-ready');
        setLoadStatus('loaded');
        checkIfAbleToLand();
      })
      .catch((err) => {
        setStatus('will-queue-when-ready');
        setLoadStatus('loaded');
        console.error(err);
        setStatus('unknown-error');
      });
  };

  const onCheckAgainClicked = () => {
    setLoadStatus('not-loaded');
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
        loadStatus={loadStatusRef.current}
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
        pullRequestId={pullRequestId}
        repoName={repoName}
      />
    </div>
  );
};

export default App;
