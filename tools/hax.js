const fs = require('fs');
const path = require('path');

const typesPath = path.resolve(
  __dirname,
  '..',
  'node_modules',
  '@types',
  'passport',
  'index.d.ts',
);

if (fs.existsSync(typesPath)) {
  fs.writeFileSync(
    typesPath,
    fs.readFileSync(typesPath, 'utf8').replace('user?: any;', ''),
  );
}
