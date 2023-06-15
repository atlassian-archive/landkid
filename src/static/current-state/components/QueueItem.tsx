import React from 'react';
import { css } from 'emotion';
import distanceInWords from 'date-fns/distance_in_words_to_now';
import { Lozenge } from './Lozenge';
import { LozengeAppearance } from './types';
import { User } from './User';

const queueItemStyles = css({
  display: 'block',
  boxSizing: 'border-box',
  padding: '14px 14px 14px',
  position: 'relative',
  boxShadow: 'rgba(23, 43, 77, 0.24) 0px 0px 1px 0px',
  backgroundColor: 'white',
  borderRadius: '3px',
  transition: 'box-shadow 0.3s',
  color: 'inherit',

  '&:hover': {
    boxShadow: 'rgba(23, 43, 77, 0.32) 0px 4px 8px -2px, rgba(23, 43, 77, 0.25) 0px 0px 1px',
    color: 'inherit',
    textDecoration: 'none',
  },

  '& .queue-item__title': {
    fontSize: '16px',
    fontWeight: 500,
    lineHeight: '1.25',
    maxWidth: '100%',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    marginBottom: '10px',
  },

  '& .queue-item__status-line': {
    display: 'flex',
    flexGrow: 1,
    flexWrap: 'nowrap',
    marginTop: 'auto',
    marginBottom: '5px',
  },

  '& .queue-item__status-item': {
    display: 'inline-flex',
    flexDirection: 'row',
    alignItems: 'center',
    height: '2.5%',
    flexWrap: 'nowrap',
    marginBottom: '5px',

    '& + .queue-item__status-item': {
      marginLeft: '9px',
    },
  },

  '& .queue-item__status-item-title': {
    display: 'block',
    color: 'var(--n300-color)',
    fontSize: '12px',
    lineHeight: '1.33333',
    marginRight: '6px',
  },

  '& .queue-item__clickable': {
    userSelect: 'none',
    '&:hover': {
      cursor: 'pointer',
    },
  },

  '& .queue-item__more-info': {
    marginRight: '8px',
    display: 'flex',
    flexDirection: 'column',
    flexWrap: 'wrap',

    '&::-webkit-scrollbar': {
      display: 'none',
    },
  },

  '& .queue-item__button': {
    backgroundColor: 'var(--n20-color)',
    color: 'var(--n500-color)',
    border: 'none',
    borderRadius: '3px',
    marginRight: 5,
    cursor: 'pointer',
    padding: '2 4 3',
    fontSize: '11px',
    fontWeight: 700,
    verticalAlign: 'baseline',
    textTransform: 'uppercase',
    '&:focus': {
      outline: 'none',
    },
  },
});

const queueItemJoinedStyles = css({
  paddingTop: '27px',
  position: 'relative',
  '&:before': {
    position: 'absolute',
    display: 'block',
    content: '""',
    width: '1px',
    height: '27px',
    background: 'var(--n20-color)',
    top: '0',
    left: '50%',
    marginLeft: '-1px',
  },
});

const icon = css({
  height: '11px',
  width: '11px',
  marginBottom: '-1px',
  paddingRight: '2px',
});

const pipeSeparator = css({
  fontWeight: 'normal',
  color: '#CCC',
});

const prTitleLink = css`
  text-decoration: none;
  color: #344563;

  &:hover {
    color: #222;
  }
`;

const duration = (start: number, end: number) => {
  const diffMs = end - start;
  const rawSeconds = diffMs / 1000;
  const minutes = Math.floor(rawSeconds / 60);
  const seconds = Math.floor(rawSeconds - minutes * 60);
  return `${minutes}m ${seconds}s`;
};

export type StatusItemProps = {
  title: string;
  id?: string;
};

export const StatusItem: React.FunctionComponent<StatusItemProps> = (props) => (
  <div className="queue-item__status-item">
    <span className="queue-item__status-item-title" data-test-id={`queue-item-${props?.id}`}>
      {props.title}
    </span>
    <span data-test-id={`${props?.id}-value`}>{props.children}</span>
  </div>
);

const landStatusToAppearance: Record<IStatusUpdate['state'], LozengeAppearance> = {
  'will-queue-when-ready': 'new',
  queued: 'new',
  running: 'inprogress',
  'awaiting-merge': 'new',
  merging: 'new',
  success: 'success',
  fail: 'removed',
  aborted: 'moved',
};

const landStatusToNiceString: Record<IStatusUpdate['state'], string> = {
  'will-queue-when-ready': 'Waiting to Land',
  queued: 'In Queue',
  running: 'Running',
  'awaiting-merge': 'Awaiting Merge',
  merging: 'Merging',
  success: 'Succeeded',
  aborted: 'Aborted',
  fail: 'Failed',
};

const landStatusToPastTense: Record<IStatusUpdate['state'], string> = {
  'will-queue-when-ready': 'Told To Land When Ready',
  queued: 'Told To Land',
  running: 'Started',
  'awaiting-merge': 'Ready to Merge',
  merging: 'Merge Started',
  success: 'Succeeded',
  fail: 'Failed',
  aborted: 'Aborted',
};

const ADMIN_CONTROLS = {
  REMOVE: 'remove',
  CANCEL: 'cancel',
  PRIORITY: 'priority',
};

const targetBranchToAppearance = (branch?: string) =>
  branch === 'master' ? 'moved' : branch === 'develop' ? 'new' : 'default';

const buildUrlFromId = (base: string, id: number) => `${base}/addon/pipelines/home#!/results/${id}`;

const prUrlFromId = (base: string, id: number) => `${base}/pull-requests/${id}`;

export type QueueItemProps = {
  status: IStatusUpdate;
  bitbucketBaseUrl: string;
  queue?: IStatusUpdate[];
  refreshData: () => void;
};

type QueueItemState = {
  status: IStatusUpdate;
  landRequestInfo: IStatusUpdate[] | null;
};

export class QueueItem extends React.Component<QueueItemProps, QueueItemState> {
  state: QueueItemState = {
    status: this.props.status,
    landRequestInfo: null,
  };

  refreshCard = () => {
    this.displayMoreInfo();
    this.props.refreshData();
  };

  handleAdminControlClick = (action: string, body?: any) => {
    fetch(`/api/${action}/${this.props.status.requestId}`, {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body || {}),
    })
      .then((response) => response.json())
      .then((json) => {
        if (json.error) {
          console.error(json.error);
          window.alert(json.error);
        } else {
          this.refreshCard();
        }
      });
  };

  displayMoreInfo = () => {
    return fetch(`/api/landrequests?ids=${this.props.status.requestId}`, { method: 'GET' })
      .then((response) => response.json())
      .then((landRequestInfo) =>
        this.setState({
          status: landRequestInfo.statuses[this.props.status.requestId].find(
            (status: IStatusUpdate) => status.isLatest === true,
          ),
          landRequestInfo: landRequestInfo.statuses[this.props.status.requestId],
        }),
      );
  };

  renderMoreInfo = (status: IStatusUpdate, dependsOn: string[]) => {
    if (this.state.landRequestInfo === null) return null;
    return (
      <div className="queue-item__more-info">
        <div className="queue-item__status-line">
          {this.state.landRequestInfo.map((status, index, statuses) => (
            <StatusItem
              title={
                index === 0
                  ? 'Status History:'
                  : `→ ${duration(+new Date(statuses[index - 1].date), +new Date(status.date))} →`
              }
            >
              <Lozenge
                appearance={landStatusToAppearance[status.state]}
                title={status.reason || undefined}
              >
                {landStatusToNiceString[status.state]}
              </Lozenge>
            </StatusItem>
          ))}
        </div>
        {status.reason && status.state !== 'queued' ? (
          <div className="queue-item__status-line">
            <StatusItem title="Reason:">
              <span>{status.reason}</span>
            </StatusItem>
          </div>
        ) : null}
        {status.request.triggererAaid ? (
          <div className="queue-item__status-line">
            <StatusItem title="Landed by:">
              <Lozenge>
                <User aaid={status.request.triggererAaid}>
                  {(user) => {
                    return user.displayName;
                  }}
                </User>
              </Lozenge>
            </StatusItem>
          </div>
        ) : null}
        {['success', 'fail', 'aborted'].includes(status.state) && dependsOn.length > 0 ? (
          <div className="queue-item__status-line">
            <StatusItem title="Depended On:">{dependsOn.join(', ')}</StatusItem>
          </div>
        ) : null}
        {status.state === 'queued' && status.request.priority !== null ? (
          <div className="queue-item__status-line">
            <StatusItem id="priority" title="Priority:">
              {status.request.priority}
              &nbsp;
              <button
                className="queue-item__button"
                onClick={() =>
                  this.handleAdminControlClick(ADMIN_CONTROLS.PRIORITY, {
                    priority: (status.request.priority ?? 0) + 1,
                  })
                }
              >
                ▲
              </button>
              <button
                className="queue-item__button"
                onClick={() =>
                  this.handleAdminControlClick(ADMIN_CONTROLS.PRIORITY, {
                    priority: (status.request.priority ?? 0) - 1,
                  })
                }
              >
                ▼
              </button>
            </StatusItem>
          </div>
        ) : null}
        {status.request.impact ? (
          <div className="queue-item__status-line">
            <StatusItem id="impact" title="Impact:">
              {status.request.impact}
            </StatusItem>
          </div>
        ) : null}
        {status.state === 'queued' ? (
          <div className="queue-item__status-line">
            <StatusItem title="Admin Controls:">
              <button
                className="queue-item__button"
                onClick={() => this.handleAdminControlClick(ADMIN_CONTROLS.REMOVE)}
              >
                Remove
              </button>
            </StatusItem>
          </div>
        ) : null}
        {['running', 'awaiting-merge', 'merging'].includes(status.state) ? (
          <div className="queue-item__status-line">
            <StatusItem title="Admin Controls:">
              <button
                className="queue-item__button"
                onClick={() => this.handleAdminControlClick(ADMIN_CONTROLS.CANCEL)}
              >
                Cancel
              </button>
            </StatusItem>
          </div>
        ) : null}
      </div>
    );
  };

  render() {
    const { bitbucketBaseUrl } = this.props;
    const { status } = this.state;
    const {
      request: { dependsOnPrIds, pullRequestId, pullRequest },
    } = status;

    const buildId = status.request.buildId;
    const buildUrl = buildId ? buildUrlFromId(bitbucketBaseUrl, buildId) : '#';

    const dependsOnPRs: string[] = dependsOnPrIds
      ? dependsOnPrIds?.split(',').map((dep) => '#' + dep)
      : [];

    console.log(dependsOnPRs);

    return (
      <div className={`${queueItemStyles} queue-item`}>
        <div className="queue-item__title">
          {buildId && (
            <>
              {'Build '}
              <a href={buildUrl} target="_blank">{`#${buildId}`}</a>
              <span className={pipeSeparator}> | </span>
            </>
          )}
          {`PR #${pullRequest.prId}`}
          <span className={pipeSeparator}> | </span>
          <a
            className={prTitleLink}
            href={prUrlFromId(bitbucketBaseUrl, pullRequestId)}
            target="_blank"
          >
            {pullRequest.title}
          </a>
        </div>
        <div className="queue-item__status-line">
          <StatusItem title="Status:">
            <Lozenge appearance={status ? landStatusToAppearance[status.state] : 'new'}>
              {landStatusToNiceString[status.state]}
            </Lozenge>
          </StatusItem>

          <StatusItem title="Author:">
            <Lozenge>
              <User aaid={pullRequest.authorAaid}>
                {(user) => {
                  return user.displayName;
                }}
              </User>
            </Lozenge>
          </StatusItem>

          {pullRequest.targetBranch ? (
            <StatusItem title="Target Branch:">
              <Lozenge
                appearance={targetBranchToAppearance(pullRequest.targetBranch)}
                title={pullRequest.targetBranch}
              >
                {pullRequest.targetBranch}
              </Lozenge>
            </StatusItem>
          ) : null}

          <StatusItem title={`${landStatusToPastTense[status.state]}:`}>
            {distanceInWords(status.date, { addSuffix: true })}
          </StatusItem>
        </div>

        {['running', 'awaiting-merge', 'merging'].includes(status.state) &&
        dependsOnPRs.length > 0 ? (
          <div className="queue-item__status-line">
            <StatusItem title="Build depends on:">{dependsOnPRs.join(', ')}</StatusItem>
          </div>
        ) : null}

        <div className="queue-item__status-line">
          <div
            className="queue-item__clickable"
            style={{ width: '95px' }}
            onClick={() =>
              this.state.landRequestInfo
                ? this.setState({ landRequestInfo: null })
                : this.displayMoreInfo()
            }
          >
            <svg focusable="false" className={icon}>
              <use xlinkHref={`#ak-icon-${this.state.landRequestInfo ? 'cross' : 'add'}`} />
            </svg>
            <StatusItem
              title={this.state.landRequestInfo ? 'Show less' : 'Show more...'}
              id={status.state === 'queued' && status.request.priority !== null ? 'show-more' : ''}
            />
          </div>
        </div>
        {this.renderMoreInfo(status, dependsOnPRs)}
      </div>
    );
  }
}

export const QueueItemJoined: React.FunctionComponent<QueueItemProps> = (props) => (
  <div className={`${queueItemJoinedStyles} queue-item-joined`}>
    <QueueItem {...props} />
  </div>
);
