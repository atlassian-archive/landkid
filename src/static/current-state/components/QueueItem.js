// @flow

import React from 'react';
import type { Node } from 'react';
import { css } from 'emotion';
import distanceInWords from 'date-fns/distance_in_words_to_now';
import { Lozenge } from './Lozenge';
import type { LandRequest, StatusEvent } from '../../../types';

let queueItemStyles = css({
  display: 'block',
  boxSizing: 'border-box',
  padding: '12px 12px 8px',
  position: 'relative',
  boxShadow: 'rgba(23, 43, 77, 0.24) 0px 0px 1px 0px',
  backgroundColor: 'white',
  borderRadius: '3px',
  transition: 'box-shadow 0.3s',
  color: 'inherit',

  '&:hover': {
    boxShadow:
      'rgba(23, 43, 77, 0.32) 0px 4px 8px -2px, rgba(23, 43, 77, 0.25) 0px 0px 1px',
    color: 'inherit',
    textDecoration: 'none'
  },

  '& .queue-item__title': {
    fontSize: '16px',
    fontWeight: '500',
    lineHeight: '1.25',
    maxWidth: '100%',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    marginBottom: '3px'
  },

  '& .queue-item__status-line': {
    display: 'flex',
    flexGrow: 1,
    flexWrap: 'wrap',
    marginTop: 'auto',
    overflow: 'hidden',
    height: '28px'
  },

  '& .queue-item__status-item': {
    display: 'inline-flex',
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 'calc(100% - 16px)',
    height: '28px',

    '& + .queue-item__status-item': {
      marginLeft: '9px'
    }
  },

  '& .queue-item__status-item-title': {
    display: 'block',
    color: 'var(--n300-color)',
    fontSize: '12px',
    lineHeight: '1.33333',
    marginRight: '6px'
  }
});

let queueItemJoinedStyles = css({
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
    marginLeft: '-1px'
  }
});

let duration = (start: number, end: number) => {
  let diffMs = end - start;
  let rawSeconds = diffMs / 1000;
  let minutes = Math.floor(rawSeconds / 60);
  let seconds = Math.floor(rawSeconds - minutes * 60);
  return `${minutes}m ${seconds}s`;
};

export function StatusItem(props: { title: string, children: Node }) {
  return (
    <div className="queue-item__status-item">
      <span className="queue-item__status-item-title">{props.title}</span>
      {props.children}
    </div>
  );
}

let buildStatusToAppearance = {
  DEFAULT: 'default',
  SUCCESSFUL: 'success',
  FAILED: 'removed',
  STOPPED: 'moved',
  INPROGRESS: 'inprogress',
  PENDING: 'new'
};

export type QueueItemProps = {
  build: LandRequest,
  statusEvent?: StatusEvent
};

export function QueueItem(props: QueueItemProps) {
  let { build, statusEvent } = props;
  return (
    <a
      className={`${queueItemStyles} queue-item`}
      href={statusEvent ? statusEvent.buildUrl : '#'}
    >
      <div className="queue-item__title">
        [#{build.buildId}] {build.title}
      </div>
      <div className="queue-item__status-line">
        <StatusItem title="Status:">
          <Lozenge
            appearance={buildStatusToAppearance[build.buildStatus || 'DEFAULT']}
          >
            {build.buildStatus}
          </Lozenge>
        </StatusItem>

        <StatusItem title="Author:">
          <Lozenge>{build.username}</Lozenge>
        </StatusItem>

        {build.finishedTime ? (
          <StatusItem title="Finished:">
            {distanceInWords(build.finishedTime, { addSuffix: true })}
          </StatusItem>
        ) : null}

        {build.finishedTime ? (
          <StatusItem title="Duration:">
            <Lozenge appearance="new">
              {duration(
                +new Date(build.createdTime),
                +new Date(build.finishedTime)
              )}
            </Lozenge>
          </StatusItem>
        ) : null}
      </div>
    </a>
  );
}

export function QueueItemJoined(props: QueueItemProps) {
  return (
    <div className={`${queueItemJoinedStyles} queue-item-joined`}>
      <QueueItem {...props} />
    </div>
  );
}
