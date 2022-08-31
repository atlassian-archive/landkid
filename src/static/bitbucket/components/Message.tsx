import '@atlaskit/css-reset';
import SectionMessage, {
  SectionMessageAction,
  SectionMessageProps,
} from '@atlaskit/section-message';
import { LoadingButton as Button } from '@atlaskit/button';
import Spinner from '@atlaskit/spinner';
import Confetti from 'react-dom-confetti';

import Errors from './Errors';
import Warnings from './Warnings';
import Queue from './Queue';
import loadingRectangleStyles from './styles/loadingRectangleStyles';

type Status =
  | 'checking-can-land'
  | 'cannot-land'
  | 'queued'
  | 'can-land'
  | 'pr-closed'
  | 'user-denied-access'
  | 'unknown-error';

type Loading = 'land' | 'land-when-able';

const messageAppearance: { [keyof in Status]: SectionMessageProps['appearance'] } = {
  'checking-can-land': 'information',
  'cannot-land': 'warning',
  queued: 'success',
  'can-land': 'success',
  'pr-closed': 'success',
  'user-denied-access': 'error',
  'unknown-error': 'error',
} as const;

const messageTitle: { [keyof in Status]: string } = {
  'checking-can-land': 'Checking land status...',
  'cannot-land': 'Not ready to land',
  queued: 'Queued to land!',
  'can-land': 'Ready to land!',
  'pr-closed': 'Pull request is already closed',
  'user-denied-access': 'Access denied',
  'unknown-error': 'An unknown error occurred',
} as const;

type MessageProps = {
  appName: string;
  status: Status;
  onLandClicked: () => void;
  onLandWhenAbleClicked: () => void;
  onCheckAgainClicked: () => void;
  canLandWhenAble: boolean;
  errors: string[];
  warnings: string[];
  loading?: Loading;
  bannerMessage: {
    messageExists: boolean;
    message: string;
    messageType: 'default' | 'warning' | 'error';
  } | null;
};

/**
 * Have to override SectionMessageAction link component because
 * it doesn't support `target`. Without using `target="_blank"`
 * the link to Landkid home page would load within the Bitbucket
 * addon <iframe>
 */
const ExternalLink = ({ children }: { children: React.ReactNode }) => {
  return (
    <a href="/" target="_blank">
      {children}
    </a>
  );
};

const Message = ({
  loading,
  appName,
  status,
  onLandClicked,
  onLandWhenAbleClicked,
  onCheckAgainClicked,
  canLandWhenAble,
  errors,
  warnings,
  bannerMessage,
}: MessageProps) => {
  const renderLandState = () => {
    switch (status) {
      case 'checking-can-land': {
        return (
          <>
            <div className={loadingRectangleStyles} />
            <div className={loadingRectangleStyles} />
            <div className={loadingRectangleStyles} style={{ width: '60%' }} />
          </>
        );
      }
      case 'queued': {
        return <Queue />;
      }
      case 'cannot-land': {
        return <>This pull request cannot land until the criteria below has been met.</>;
      }
      case 'user-denied-access': {
        return (
          <>
            Remove {appName} from the list of denied applications at the bottom of{' '}
            <a href="https://bitbucket.org/account/settings/app-authorizations/" target="_blank">
              the App authorizations page
            </a>
            , then refresh this page and allow the app to access the required permissions.
          </>
        );
      }
      case 'unknown-error': {
        return <>See console for more information.</>;
      }
      case 'pr-closed': {
        return null;
      }
    }
  };

  const showWarnings = status === 'can-land' || status === 'cannot-land' || status === 'queued';
  const showErrors = status === 'cannot-land' || status === 'queued';

  const landButton = (
    <div style={{ marginRight: 15 }}>
      <Confetti
        active={loading === 'land'}
        config={{
          angle: 20,
          spread: 58,
          startVelocity: 50,
          elementCount: 70,
          dragFriction: 0.12,
          duration: 3000,
          stagger: 3,
          width: '10px',
          height: '10px',
          // Missing type
          // @ts-ignore
          perspective: '500px',
        }}
      />
      <Button appearance="primary" onClick={onLandClicked} isLoading={loading === 'land'}>
        Land changes
      </Button>
    </div>
  );

  return (
    <div>
      {bannerMessage && (
        <div style={{ marginBottom: 15 }}>
          <SectionMessage
            appearance={
              bannerMessage.messageType === 'default' ? 'information' : bannerMessage.messageType
            }
          >
            {bannerMessage.message}
          </SectionMessage>
        </div>
      )}
      <SectionMessage
        title={messageTitle[status]}
        appearance={messageAppearance[status]}
        actions={[
          ...(status === 'can-land' ? [landButton] : []),
          ...(status === 'queued'
            ? [
                <SectionMessageAction linkComponent={ExternalLink} href="/current-state">
                  View queue
                </SectionMessageAction>,
              ]
            : []),
          ...(status === 'cannot-land'
            ? [
                <SectionMessageAction onClick={onCheckAgainClicked}>
                  Check again
                </SectionMessageAction>,
              ]
            : []),
          ...(canLandWhenAble && status === 'cannot-land'
            ? [
                <SectionMessageAction linkComponent={ExternalLink} onClick={onLandWhenAbleClicked}>
                  Land when ready {loading === 'land-when-able' && <Spinner size="small" />}
                </SectionMessageAction>,
              ]
            : []),
          <SectionMessageAction href="/" linkComponent={ExternalLink}>
            Learn about Landkid
          </SectionMessageAction>,
        ]}
      >
        {renderLandState()}
        {showErrors && <Errors errors={errors} />}
        {showWarnings && <Warnings warnings={warnings} />}
      </SectionMessage>
    </div>
  );
};

export default Message;
