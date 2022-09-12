import { useEffect, useState } from 'react';

import '@atlaskit/css-reset';

import { proxyRequest } from '../utils/RequestProxy';

import Message from './Message';
import Timeout = NodeJS.Timeout;
import { Status } from './types';

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

type Loading = 'land' | 'land-when-able';

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
  const [status, setStatus] = useState<Status>('checking-can-land');
  const [loading, setLoading] = useState<Loading | undefined>();
  const [state, dispatch] = useState(initialState);

  let refreshTimeoutId: Timeout;
  let refreshIntervalMs = 5000;

  const pollAbleToLand = () => {
    const isVisible = !document.hidden;
    const checkPromise = isVisible ? checkIfAbleToLand() : Promise.resolve();
    console.log('in pollAbleToLand', 'document hidden', document.hidden);

    if (!isVisible) {
      console.log('Not visible, not polling', document.hidden);
    } else {
      console.log('visible, polling', document.hidden);
    }

    checkPromise.finally(() => {
      console.log('checkPromise resolved');
      refreshTimeoutId = setTimeout(() => {
        pollAbleToLand();
      }, refreshIntervalMs);
    });
  };

  useEffect(() => {
    console.log('setting inView to true');
    const isOpen = qs.get('state') === 'OPEN';
    if (!isOpen) {
      console.log('PR is already closed, returning');
      return setStatus('pr-closed');
    }
    pollAbleToLand();
    return () => {
      clearInterval(refreshTimeoutId);
    };
  }, []);

  const checkIfAbleToLand = () => {
    return proxyRequest<CanLandResponse>('/can-land', 'POST')
      .then(({ canLand, canLandWhenAble, errors, warnings, bannerMessage, state }) => {
        switch (state) {
          case 'queued':
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
      })
      .catch((err) => {
        setLoading(undefined);
        console.error(err);
        if (err?.code === 'USER_DENIED_ACCESS' || err?.code === 'USER_ALREADY_DENIED_ACCESS') {
          setStatus('user-denied-access');
        } else {
          setStatus('unknown-error');
        }
      });
  };

  const onLandClicked = () => {
    setLoading('land');
    proxyRequest('/land', 'POST')
      .then(() => {
        setLoading(undefined);
        setStatus('queued');
      })
      .catch((err) => {
        setLoading(undefined);
        console.error(err);
        setStatus('unknown-error');
      });
  };

  const onLandWhenAbleClicked = () => {
    setLoading('land-when-able');
    proxyRequest('/land-when-able', 'POST')
      .then(() => {
        setLoading(undefined);
        setStatus('queued');
      })
      .catch((err) => {
        setLoading(undefined);
        console.error(err);
        setStatus('unknown-error');
      });
  };

  const onCheckAgainClicked = () => {
    setStatus('checking-can-land');
    checkIfAbleToLand();
  };

  return (
    <div
      style={{
        paddingBottom: 20,
      }}
    >
      <Message
        loading={loading}
        appName={appName}
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
