# Integration Testing for Landkid

This document describes how to run the integration tests for Landkid on the dev instance.

The integration tests for Landkid are setup to target a Bitbucket repository, only available to Atlassian employees.

Currently, those integration tests cannot run in CircleCI because the Bitbucket repository they access is only accessible through VPN.

Developers would need to run the tests locally to validate their changes.

## Deploy to dev instance

For testing purposes, we recommend using the [dev](https://atlassian-frontend-landkid.dev.services.atlassian.com/current-state/) instance.

(For strict local dev loop, see this [document](https://bitbucket.org/atlassian/atlassian-frontend-landkid-deployment/src/master/development.md) )

### Workflow

1. Push your changes to CircleCI
2. Grab the image number from the `publish` step in CircleCI build from your PR in GitHub - for example: https://app.circleci.com/pipelines/github/atlassian/landkid/396/workflows/4445d64a-b96d-4f2c-bec4-f0d8d4a6b251/jobs/1499 -> `circle-1499`
3. Access the [atlassian-frontend-landkid-deployment repository](https://bitbucket.org/atlassian/atlassian-frontend-landkid-deployment/src/master/)
4. Create a branch and replace `LANDKID_VERSION` var in this [file](https://bitbucket.org/atlassian/atlassian-frontend-landkid-deployment/src/HEAD/build/vars.sh#lines-5) by the image number from step 2.
5. Commit and push your changes
6. Deployment to `dev` environment would need to be manually from the latest pipeline / your latest change.

## Setup environment variables

In this repository:

1. Create your own copy of `cypress.env.json` - the file is `.gitignore` but make sure it is not committed by mistake.
2. Ask access to the folder `Landkid credentials for testing` in LastPass
3. Fill out the environment variables required

```
{
    "BITBUCKET_APP_PASSWORD": "bitbucket app password",
    "LANDKID_SESSION_ID": "landkid.sid cookie from https://atlassian-frontend-landkid.dev.services.atlassian.com/current-state/, this is used by circleCI",
    "LANDKID_DEV_SESSION_ID"; "this is used in the local dev loop, use the LANDKID_SESSION_ID value to test a dev deployment locally otherwise use the landkid.sid cookie in your local instance of landkid",
    "LANDKID_DEV_URL": "https://atlassian-frontend-landkid.dev.services.atlassian.com/current-state/ to test a dev deployment or https://[basurl]/current-state for local testing",
    "CUSTOM_TOKEN": "token for specific endpoints - use the HASHED_CUSTOM_TOKEN"
}
```

To get the `LANDKID_SESSION_ID`, you would need to visit the [dev instance](https://atlassian-frontend-landkid.dev.services.atlassian.com/current-state/) and grab the `landkid.sid` from your browser in chrome://settings/siteData and look for `atlassian-frontend-landkid.dev`.

This environment variable is required to be authenticated while running the tests.

4. Run `yarn test:integration:watch` to watch and debug the tests or `yarn test:integration` to run it in `headless` mode.

_Note_: if you need to see any logs when running in `headless` mode, add `ELECTRON_ENABLE_LOGGING=1` to the command `yarn test:integration`.
