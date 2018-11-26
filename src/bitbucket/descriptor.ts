export const makeDescriptor = (baseUrl: string, repoUuid: string) => ({
  name: `Landkid ${(process.env.LANDKID_DEPLOYMENT || 'local').toUpperCase()}`,
  description: "Addon to display a 'release queue' panel in PRs",
  baseUrl,
  key: `landkid-${process.env.LANDKID_DEPLOYMENT || 'local'}`,
  vendor: {
    name: 'Fabric Build',
  },
  scopes: ['pullrequest'],
  authentication: {
    type: 'jwt',
  },
  contexts: ['account'],
  lifecycle: {
    installed: '/bitbucket/lifecycle/installed',
    uninstalled: '/bitbucket/lifecycle/uninstalled',
  },
  modules: {
    proxy: {
      '/can-land/{repository}/{pullrequest}': {
        destination:
          '/bitbucket/proxy/can-land?aaid={user.account_id}&pullRequestId={pullrequest.id}',
      },
      '/land/{repository}/{pullrequest}': {
        destination:
          '/bitbucket/proxy/land?aaid={user.account_id}&pullRequestId={pullrequest.id}&commit={pullrequest.source.commit.hash}',
      },
      '/land-when-able/{repository}/{pullrequest}': {
        destination:
          '/bitbucket/proxy/land-when-able?aaid={user.account_id}&pullRequestId={pullrequest.id}&commit={pullrequest.source.commit.hash}',
      },
    },
    webPanels: [
      {
        weight: 100,
        tooltip: {
          value: 'Packages to be released in this PR',
        },
        key: 'atlaskid-addon-panel',
        name: {
          value: `Landkid Queue${
            process.env.LANDKID_DEPLOYMENT !== 'prod' ? ` (${process.env.LANDKID_DEPLOYMENT})` : ''
          }`,
        },
        url:
          '/bitbucket/index.html?state={pullrequest.state}&repoId={repository.uuid}&pullRequestId={pullrequest.id}',
        location: 'org.bitbucket.pullrequest.overview.informationPanel',
        conditions: [
          {
            condition: 'has_permission',
            params: {
              permission: 'write',
            },
          },
          {
            condition: 'equals',
            target: 'repository.uuid',
            params: {
              value: repoUuid,
            },
          },
        ],
      },
    ],
    webhooks: [
      {
        event: 'repo:commit_status_updated',
        url: '/bitbucket/webhook/status-updated',
      },
    ],
  },
});
