const fs = require('fs');
const path = require('path');

const cypressSupportPath = path.resolve(__dirname, '..', 'cypress', 'support', 'index.js');

if (fs.existsSync(cypressSupportPath)) {
  fs.writeFileSync(
    cypressSupportPath,
    fs
      .readFileSync(cypressSupportPath, 'utf8')
      .replace('LANDKID_SESSION_ID', 'LANDKID_DEV_SESSION_ID')
      .replace(
        "'https://atlassian-frontend-landkid.dev.services.atlassian.com/current-state/'",
        "Cypress.env('LANDKID_DEV_URL')",
      ),
  );
}
