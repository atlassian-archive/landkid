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
import { css, keyframes } from 'emotion';

const getMessageAppearance = (
  loadStatus: LoadStatus,
  status: Status | undefined,
): SectionMessageProps['appearance'] => {
  if (loadStatus === 'loading' || !status) {
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

  return messageAppearance[status];
};

const getMessageTitle = (loadStatus: LoadStatus, status: Status | undefined): string => {
  if (loadStatus === 'loading' || !status) {
    return 'Checking land status...';
  }

  const messageTitle: { [keyof in Status]: string } = {
    running: 'Building...',
    'awaiting-merge': 'Waiting to merge pull request...',
    'will-queue-when-ready': 'Queued to land when ready!',
    merging: 'Pull request is being merged...',
    'cannot-land': 'Not ready to land',
    queued: 'Queued to land!',
    'can-land': 'Ready to land!',
    'pr-closed': 'Pull request is already closed',
    'user-denied-access': 'Access denied',
    'unknown-error': 'An unknown error occurred',
  };
  return messageTitle[status];
};

type MessageProps = {
  appName: string;
  status?: Status;
  onLandClicked: () => void;
  onLandWhenAbleClicked: () => void;
  onCheckAgainClicked: () => void;
  canLand: boolean;
  canLandWhenAble: boolean;
  errors: string[];
  warnings: string[];
  loadStatus: LoadStatus;
  queue?: QueueResponse['queue'];
  pullRequestId: number;
  repoName: string;
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

const rotating = keyframes({
  from: {
    transform: 'rotate(0deg)',
  },
  to: {
    transform: 'rotate(360deg)',
  },
});

const pipelineSpinnerStyles = css({
  animation: `${rotating} 2s ease-in-out infinite`,
  transformOrigin: 'center',
});

const PipelineSpinner = () => {
  return (
    <svg
      className={pipelineSpinnerStyles}
      role="presentation"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 12a12.06 12.06 0 0 1 3.52-8.48A12.07 12.07 0 0 1 16.66.96c1.43.6 2.72 1.46 3.82 2.56a12.07 12.07 0 0 1 2.56 13.14 12.06 12.06 0 0 1-2.56 3.82 12.07 12.07 0 0 1-13.14 2.56 12.06 12.06 0 0 1-3.82-2.56A12.07 12.07 0 0 1 0 12Zm18.59 2.1a7.02 7.02 0 0 0-8.83-8.83l.91 2.86a4.01 4.01 0 0 1 5.06 5.05l2.86.92Zm-5.56 1.77a4.01 4.01 0 0 1-5.05-5.05l-2.86-.91a7.02 7.02 0 0 0 8.83 8.82l-.92-2.86Z"
        fill="#0065FF"
      />
    </svg>
  );
};

const Message = ({
  loadStatus,
  appName,
  status,
  queue,
  onLandClicked,
  onLandWhenAbleClicked,
  onCheckAgainClicked,
  canLandWhenAble,
  canLand,
  errors,
  warnings,
  bannerMessage,
  pullRequestId,
  repoName,
}: MessageProps) => {
  const renderLandState = () => {
    switch (status) {
      case 'running': {
        const queueItem = queue?.find((item) => item.request.pullRequestId === pullRequestId);
        const buildLink = queueItem ? (
          <span>
            (
            <b>
              <a
                target="_blank"
                href={`https://bitbucket.org/${repoName}/pipelines/results/${queueItem.request.buildId}`}
              >
                #{queueItem.request.buildId}
              </a>
            </b>
            )
          </span>
        ) : (
          ''
        );
        return (
          <>
            Build checks are being run for this pull request {buildLink}. If they succeed, the pull
            request will be merged.{' '}
          </>
        );
      }
      case 'awaiting-merge':
        return (
          <>This pull request is waiting for other dependents to finish before it is merged. </>
        );
      case 'will-queue-when-ready':
        return (
          <>
            This pull request will be added to the land queue when the criteria below have been met
            —
          </>
        );
      case 'merging':
        return <>This pull request has passed all checks and is being merged.</>;
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
      default: {
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

  const getLandButton = (label: string) => (
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
        {label}
      </Button>
    </div>
  );

  const getActions = () => {
    const actions = [];
    switch (status) {
      case 'can-land':
        actions.push(getLandButton('Land changes'));
        break;
      case 'running':
      case 'queued':
      case 'awaiting-merge':
        actions.push(
          <SectionMessageAction linkComponent={ExternalLink} href="/current-state">
            View queue
          </SectionMessageAction>,
        );
        break;
      case 'will-queue-when-ready':
        if (canLand) {
          actions.push(getLandButton('Land immediately'));
        }

        actions.push(
          <SectionMessageAction onClick={onCheckAgainClicked}>Check again</SectionMessageAction>,
        );
        break;
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
        icon={status === 'running' ? PipelineSpinner : undefined}
        title={getMessageTitle(loadStatus, status)}
        appearance={getMessageAppearance(loadStatus, status)}
        actions={getActions()}
      >
        {loadStatus === 'loading' ? (
          <>
            <div className={loadingRectangleStyles} />
            <div className={loadingRectangleStyles} />
            <div className={loadingRectangleStyles} style={{ width: '60%' }} />
          </>
        ) : (
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
        )}
      </SectionMessage>
    </div>
  );
};

export default Message;
