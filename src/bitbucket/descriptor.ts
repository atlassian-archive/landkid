import { config } from '../lib/Config';

const getAppName = () =>
  `${config.name || 'Landkid'} ${(process.env.LANDKID_DEPLOYMENT || 'local').toUpperCase()}`;

export const getAppKey = () =>
  `${config.key || 'landkid'}-${process.env.LANDKID_DEPLOYMENT || 'local'}`;

export const makeDescriptor = () => {
  const appName = getAppName();
  const appKey = getAppKey();

  const addonName = `Landkid Queue${
    process.env.LANDKID_DEPLOYMENT !== 'prod'
      ? ` (${process.env.LANDKID_DEPLOYMENT || 'local'})`
      : ''
  }`;

  const params = new URLSearchParams();
  params.append('appName', appName);
  const appNameQueryString = params.toString();

  return {
    name: appName,
    description: 'Addon to add PRs to a merge queue',
    baseUrl: config.baseUrl,
    key: appKey,
    vendor: {
      name: 'Fabric Build',
    },
    // :write implies base scope (e.g. pullrequest:write implies pullrequest)
    // pullrequest:write requires repository:write so we don't need to define that as well
    scopes: ['account', 'pullrequest:write', 'pipeline:write'],
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
            '/bitbucket/proxy/can-land?aaid={user.uuid}&pullRequestId={pullrequest.id}&accountId={user.account_id}',
        },
        '/queue': {
          destination: '/bitbucket/proxy/queue',
        },
        '/land/{repository}/{pullrequest}': {
          destination:
            '/bitbucket/proxy/land?aaid={user.uuid}&pullRequestId={pullrequest.id}&commit={pullrequest.source.commit.hash}&accountId={user.account_id}',
        },
        '/land-when-able/{repository}/{pullrequest}': {
          destination:
            '/bitbucket/proxy/land-when-able?aaid={user.uuid}&pullRequestId={pullrequest.id}&commit={pullrequest.source.commit.hash}&accountId={user.account_id}',
        },
      },
      webPanels: [
        {
          weight: 100,
          tooltip: {
            value: 'Landkid PR panel',
          },
          key: 'landkid-addon-panel',
          name: {
            value: addonName,
          },
          url: `/bitbucket/index.html?state={pullrequest.state}&repoId={repository.uuid}&pullRequestId={pullrequest.id}&${appNameQueryString}`,
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
                value: config.repoConfig.uuid,
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
  };
};
