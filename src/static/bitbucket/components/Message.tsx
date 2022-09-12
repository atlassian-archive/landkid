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
import { LoadStatus, QueueResponse, Status } from './types';
import { css } from 'emotion';

const getMessageAppearance = (
  loadStatus: LoadStatus,
  status: Status | undefined,
): SectionMessageProps['appearance'] => {
  if (loadStatus === 'loading') {
    return 'information';
  }

  const messageAppearance: { [keyof in Status]: SectionMessageProps['appearance'] } = {
    running: 'information',
    'awaiting-merge': 'information',
    'will-queue-when-ready': 'information',
    merging: 'information',
    'cannot-land': 'warning',
    queued: 'success',
    'can-land': 'success',
    'pr-closed': 'success',
    'user-denied-access': 'error',
    'unknown-error': 'error',
  };

  return status ? messageAppearance[status] : 'information';
};

const getMessageTitle = (loadStatus: LoadStatus, status: Status | undefined): string => {
  if (loadStatus === 'loading') {
    return 'Checking land status...';
  }

  const messageTitle: { [keyof in Status]: string } = {
    running: 'Building...',
    'awaiting-merge': 'Awaiting to merge pull request...',
    'will-queue-when-ready': 'Queued to land when ready!',
    merging: 'Pull request is being merged...',
    'cannot-land': 'Not ready to land',
    queued: 'Queued to land!',
    'can-land': 'Ready to land!',
    'pr-closed': 'Pull request is already closed',
    'user-denied-access': 'Access denied',
    'unknown-error': 'An unknown error occurred',
  };
  return status ? messageTitle[status] : 'Unknown';
};

type MessageProps = {
  appName: string;
  status?: Status;
  onLandClicked: () => void;
  onLandWhenAbleClicked: () => void;
  onCheckAgainClicked: () => void;
  canLandWhenAble: boolean;
  errors: string[];
  warnings: string[];
  loadStatus: LoadStatus;
  queue?: QueueResponse['queue'];
  pullRequestId: number;
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

const messageContentStyles = css({
  position: 'relative',
});

const refreshIndicatorStyles = css({
  position: 'absolute',
  right: 0,
  top: '-35px',
});

const Message = ({
  loadStatus,
  appName,
  status,
  queue,
  onLandClicked,
  onLandWhenAbleClicked,
  onCheckAgainClicked,
  canLandWhenAble,
  errors,
  warnings,
  bannerMessage,
  pullRequestId,
}: MessageProps) => {
  const renderLandState = () => {
    if (loadStatus === 'loading') {
      return (
        <>
          <div className={loadingRectangleStyles} />
          <div className={loadingRectangleStyles} />
          <div className={loadingRectangleStyles} style={{ width: '60%' }} />
        </>
      );
    }
    switch (status) {
      case 'awaiting-merge':
        return <>This pull request is waiting to be merged. </>;
      case 'will-queue-when-ready':
        return (
          <>
            This pull request will be added to the land queue when the criteria below have been met
            —
          </>
        );
      case 'merging':
        return <>This pull request has passed all checks and is being merged.</>;
      case 'running':
      case 'queued': {
        return <Queue queue={queue} pullRequestId={pullRequestId} />;
      }
      case 'cannot-land': {
        return <>This pull request cannot land until the criteria below has been met —</>;
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

  const showWarnings =
    status === 'can-land' ||
    status === 'cannot-land' ||
    status === 'queued' ||
    status == 'will-queue-when-ready' ||
    status === 'running';

  const showErrors =
    status === 'cannot-land' || status === 'queued' || status == 'will-queue-when-ready';

  const landButton = (
    <div style={{ marginRight: 15 }}>
      <Confetti
        active={loadStatus === 'queuing'}
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
      <Button appearance="primary" onClick={onLandClicked} isLoading={loadStatus === 'queuing'}>
        Land changes
      </Button>
    </div>
  );

  const getActions = () => {
    const actions = [];
    switch (status) {
      case 'can-land':
        actions.push(landButton);
        break;
      case 'running':
      case 'queued':
        actions.push(
          <SectionMessageAction linkComponent={ExternalLink} href="/current-state">
            View queue
          </SectionMessageAction>,
        );
        break;
      case 'will-queue-when-ready':
      case 'cannot-land': {
        actions.push(
          <SectionMessageAction onClick={onCheckAgainClicked}>Check again</SectionMessageAction>,
        );
        if (canLandWhenAble) {
          actions.push(
            <SectionMessageAction linkComponent={ExternalLink} onClick={onLandWhenAbleClicked}>
              Land when ready {loadStatus === 'queuing' && <Spinner size="small" />}
            </SectionMessageAction>,
          );
        }
        break;
      }
    }

    actions.push(
      <SectionMessageAction href="/" linkComponent={ExternalLink}>
        Learn about Landkid
      </SectionMessageAction>,
    );

    return actions;
  };

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
        title={getMessageTitle(loadStatus, status)}
        appearance={getMessageAppearance(loadStatus, status)}
        actions={getActions()}
      >
        <div className={messageContentStyles}>
          {renderLandState()}
          {showErrors && <Errors errors={errors} />}
          {showWarnings && <Warnings warnings={warnings} />}
          {loadStatus === 'refreshing' && (
            <div className={refreshIndicatorStyles}>
              <Spinner size="small" />
            </div>
          )}
        </div>
      </SectionMessage>
    </div>
  );
};

export default Message;
