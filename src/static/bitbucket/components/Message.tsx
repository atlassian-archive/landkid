import '@atlaskit/css-reset';
import SectionMessage, {
  SectionMessageAction,
  SectionMessageProps,
} from '@atlaskit/section-message';
import { LoadingButton as Button } from '@atlaskit/button';
import Spinner from '@atlaskit/spinner';

import Errors from './Errors';
import Warnings from './Warnings';

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
  'checking-can-land': 'Loading Landkid...',
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
        return <Spinner />;
      }
      case 'cannot-land': {
        return <>This pull request cannot land until the criteria below has been met.</>;
      }
      case 'user-denied-access': {
        return (
          <>
            Remove {appName} from the list of denied applications at the bottom of{' '}
            <a href="https://bitbucket.org/account/settings/app-authorizations/">
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

  return (
    <div
      style={{
        // Prevents cumulative layout shift caused by slow loads
        height: 200,
        overflowY: 'auto',
      }}
    >
      {bannerMessage && (
        <div style={{ marginBottom: 15 }}>
          <SectionMessage appearance={bannerMessage.messageType}>
            {bannerMessage.message}
          </SectionMessage>
        </div>
      )}
      <SectionMessage
        title={messageTitle[status]}
        appearance={messageAppearance[status]}
        actions={[
          status === 'queued' && (
            <SectionMessageAction href="/current-state">View queue</SectionMessageAction>
          ),
          status === 'cannot-land' && (
            <SectionMessageAction onClick={onCheckAgainClicked}>Check again</SectionMessageAction>
          ),
          canLandWhenAble && status === 'cannot-land' && (
            <SectionMessageAction onClick={onLandWhenAbleClicked}>
              Land when ready {loading === 'land-when-able' && <Spinner size="small" />}
            </SectionMessageAction>
          ),
          <SectionMessageAction href="/">Learn about Landkid</SectionMessageAction>,
        ]}
      >
        {renderLandState()}
      </SectionMessage>
      {status === 'can-land' && (
        <div style={{ marginTop: 15 }}>
          <Button appearance="primary" onClick={onLandClicked} isLoading={loading === 'land'}>
            Land
          </Button>
        </div>
      )}
      {showErrors && <Errors errors={errors} />}
      {showWarnings && <Warnings warnings={warnings} />}
    </div>
  );
};

export default Message;
