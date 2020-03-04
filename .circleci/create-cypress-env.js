const fs = require('fs');

const { BITBUCKET_APP_PASSWORD, LANDKID_SESSION_ID, CUSTOM_TOKEN } = process.env;

fs.writeFileSync(
  'cypress.env.json',
  JSON.stringify({
    BITBUCKET_APP_PASSWORD,
    LANDKID_SESSION_ID,
    CUSTOM_TOKEN,
  }),
);
