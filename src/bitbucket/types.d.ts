declare namespace BB {
  type BuildStatusEvent = {
    buildId: number;
    buildStatus: BuildState;
  };

  type PRState = 'OPEN' | 'DECLINED' | 'MERGED';

  type User = {
    username: string;
    account_id: string;
  };

  type PullRequestResponse = {
    participants: {
      approved: boolean;
      user: User;
    }[];
    author: User;
    title: string;
    description: string;
    created_on: string;
    state: PRState;
    task_count: number;
  };

  type BuildStatusResponse = {
    name: string;
    state: BuildState;
    created_on: string;
    url: string;
  };

  type PullRequest = {
    pullRequestId: number;
    title: string;
    description: string;
    createdOn: Date;
    author: string;
    authorAaid: string;
    state: PRState;
    approvals: Array<string>;
    openTasks: number;
  };

  type RepositoryResponse = {
    uuid: string;
    full_name: string;
    description: string;
    slug: string;
    links: {
      html: {
        href: string;
      };
    };
    owner: {
      username: string;
    };
  };

  type Repository = {
    uuid: string;
    repoOwner: string;
    repoName: string;
    fullName: string;
    url: string;
  };

  type BuildState =
    | 'SUCCESSFUL'
    | 'FAILED'
    | 'INPROGRESS'
    | 'STOPPED'
    | 'DEFAULT'
    | 'PENDING';

  type BuildStatus = {
    state: BuildState;
    createdOn: Date;
    url: string;
  };
}
