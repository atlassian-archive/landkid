const fs = require('fs');
const path = require('path');

const passportTypesPath = path.resolve(
  __dirname,
  '..',
  'node_modules',
  '@types',
  'passport',
  'index.d.ts',
);

const sequelizeTypesPath = path.resolve(
  __dirname,
  '..',
  'node_modules',
  '@types',
  'sequelize',
  'index.d.ts',
);

if (fs.existsSync(passportTypesPath)) {
  fs.writeFileSync(
    passportTypesPath,
    fs.readFileSync(passportTypesPath, 'utf8').replace('user?: any;', ''),
  );
}

if (fs.existsSync(sequelizeTypesPath)) {
  fs.writeFileSync(
    sequelizeTypesPath,
    fs
      .readFileSync(sequelizeTypesPath, 'utf8')
      .replace('import ValidatorJS', 'import * as ValidatorJS'),
  );
}
