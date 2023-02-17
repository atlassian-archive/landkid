declare namespace BB {
  type BuildStatusEvent = {
    buildId: number;
    buildStatus: BuildState;
  };

  type PRState = 'OPEN' | 'DECLINED' | 'MERGED';

  type User = {
    username: string;
    // Note: We can't actually user the account_id anymore (we can't look users up by aaid)
    // We still refer to it everywhere as aaid, but we'll actually use the users uuid
    account_id: string;
    uuid: string;
  };

  type DiffStatResponse = {
    pagelen: number;
    values: Array<{
      type: string;
      status: 'added' | 'removed' | 'modified' | 'renamed' | 'merge conflict';
      lines_added: number;
      lines_removed: number;
      old: {
        type: string;
        path: string;
        commit: {
          type: string;
        };
        attributes: string;
        escaped_path: string;
      };
      new: {
        type: string;
        path: string;
        commit: {
          type: string;
        };
        attributes: string;
        escaped_path: string;
      };
    }>;
    page: number;
    size: number;
  };

  type PullRequestResponse = {
    participants: {
      approved: boolean;
      user: User;
    }[];
    author: User;
    title: string;
    description: string;
    source: {
      commit: {
        hash: string;
      };
      branch: {
        name: string;
      };
    };
    destination: {
      branch: {
        name: string;
      };
    };
    created_on: string;
    state: PRState;
    task_count: number;
  };

  type PullRequestTaskResponse = {
    pagelen: number;
    values: [
      {
        state: string;
      },
    ];
    page: number;
    size: number;
  };

  type BuildStatusResponse = {
    name: string;
    state: BuildState;
    created_on: string;
    url: string;
  };

  type MergeStatusResponse =
    | {
        task_status: 'PENDING';
      }
    | {
        task_status: 'SUCCESS';
        merge_result: any;
      };

  type PullRequest = {
    pullRequestId: number;
    title: string;
    description: string;
    createdOn: Date;
    author: string;
    authorAaid: string;
    targetBranch: string;
    commit: string;
    state: PRState;
    sourceBranch: string;
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

  type BuildState = 'SUCCESSFUL' | 'FAILED' | 'INPROGRESS' | 'STOPPED' | 'DEFAULT' | 'PENDING';

  type PRPriority = 'LOW' | 'HIGH';

  type BuildPriorityResponse = {
    name: string;
    description: PRPriority;
  };

  type BuildStatus = {
    name: string;
    state: BuildState;
    createdOn: Date;
    url: string;
  };

  interface PipelineTarget {
    type: 'pipeline_commit_target' | 'pipeline_ref_target' | 'pipeline_pullrequest_target';
    selector:
      | { type: 'default' }
      | {
          type: 'custom';
          pattern: string;
        }
      | {
          type: 'branches';
          pattern: string;
        }
      | {
          type: 'pull-requests';
          pattern: string;
        };
    commit: {
      type: 'commit';
      hash: string;
    };
    ref_type?: string;
    ref_name?: string;
  }

  type PendingState = {
    name: 'PENDING';
  };

  type InprogressState = {
    name: 'INPROGRESS';
  };

  type CompletedState = {
    name: 'COMPLETED';
    result: {
      name: 'SUCCESSFUL' | 'FAILED' | 'STOPPED';
    };
  };

  interface PipelineBase {
    uuid: string;
    repository: { [key: string]: any };
    state: PendingState | InprogressState | CompletedState;
    build_number: string;
    creator: { [key: string]: any };
    created_on: string;
    completed_on?: string;
    target: PipelineTarget;
    trigger: any;
    run_number: number;
    duration_in_seconds: number;
    build_seconds_used: number;
    first_successful: boolean;
    expired: boolean;
    links: SelfLink & StepLink;
    has_variables: boolean;
  }

  interface InprogressPipeline extends PipelineBase {
    state: InprogressState;
  }

  interface CompletedPipeline extends PipelineBase {
    state: CompletedState;
    completed_on: string;
  }

  interface PendingPipeline extends PipelineBase {
    state: PendingState;
  }

  type Pipeline = InprogressPipeline | CompletedPipeline | PendingPipeline;

  type PaginatedResponse<T> = {
    size: number;
    page: number;
    pagelen: number;
    // URI
    next?: string;
    // URI
    previous?: string;
    values: T[];
  };

  type QueryParams = {
    pagelen?: number;
    sort?: string;
    'target.ref_name'?: string;
    'target.ref_type'?: 'BRANCH';
  };
}
