// @flow
import { type Env, type CommentEvent } from '../types';

export default function land(env: Env, commentEvent: CommentEvent) {
  const positionInQueue = 0; // getCurrentQueueLength()
  const response = `Hi! You are currently [ ${positionInQueue} ] in the queue`;

  env.host.createComment(
    commentEvent.pullRequestId,
    commentEvent.commentId,
    response
  );
}
