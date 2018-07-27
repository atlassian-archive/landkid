// // @flow
// import type {
//   HostAdapter,
//   StatusEvent,
//   LandRequest,
//   HostConfig
// } from '../types';

// const GitHubAdapter: HostAdapter = (config: HostConfig) => ({
//   processStatusWebhook(body): StatusEvent | null {
//     return null;
//   },

//   async isAllowedToLand(pullRequestId: string) {
//     return {
//       isOpen: false,
//       isApproved: false,
//       isGreen: false,
//       isAllowed: false
//     };
//   },

//   async mergePullRequest(pullRequestId: string): Promise < boolean > {
//     return false;
//   },

//   async createComment(pullRequestId, parentCommentId, message) {
//     // ...
//   },

//   async pullRequestToCommitHash(pullRequestId): Promise < string > {
//     return '__commit__hash__';
//   }
// });

// export default GitHubAdapter;
