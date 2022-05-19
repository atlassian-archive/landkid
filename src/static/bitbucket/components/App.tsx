import { useEffect, useState } from 'react';

import '@atlaskit/css-reset';

import { proxyRequest } from '../utils/RequestProxy';

import Message from './Message';

type BannerMessage = {
  messageExists: boolean;
  message: string;
  messageType: 'default' | 'warning' | 'error';
};

type CanLandResponse = {
  canLand: boolean;
  canLandWhenAble: boolean;
  errors: string[];
  warnings: string[];
  bannerMessage: BannerMessage | null;
};

type Status =
  | 'checking-can-land'
  | 'cannot-land'
  | 'queued'
  | 'can-land'
  | 'pr-closed'
  | 'user-denied-access'
  | 'unknown-error';

type Loading = 'land' | 'land-when-able';

const initialState: CanLandResponse = {
  canLand: false,
  canLandWhenAble: false,
  errors: [],
  warnings: [],
  bannerMessage: null,
};

const qs = new URLSearchParams(window.location.search);
const appName = qs.get('appName') || 'Landkid';

const App = () => {
  const [status, setStatus] = useState<Status>('checking-can-land');
  const [loading, setLoading] = useState<Loading | undefined>();
  const [state, dispatch] = useState(initialState);

  useEffect(() => {
    const isOpen = qs.get('state') === 'OPEN';
    if (!isOpen) {
      return setStatus('pr-closed');
    }
    checkIfAbleToLand();
  }, []);

  const checkIfAbleToLand = () => {
    proxyRequest<CanLandResponse>('/can-land', 'POST')
      .then(({ canLand, canLandWhenAble, errors, warnings, bannerMessage }) => {
        setStatus(canLand ? 'can-land' : 'cannot-land');

        dispatch({
          canLand,
          canLandWhenAble,
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
