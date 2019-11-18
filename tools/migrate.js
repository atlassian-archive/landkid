const path = require('path');
const Sequelize = require('sequelize');
const Umzug = require('umzug');

const config = require(path.resolve(process.cwd(), 'config.js'));

// Connect to DB
const sequelize = new Sequelize(
  config.sequelize || {
    dialect: 'sqlite',
    storage: path.resolve(__dirname, '../db.sqlite'),
    logging: false,
    operatorsAliases: false,
  },
);

// Configure migration
const umzug = new Umzug({
  storage: 'sequelize',
  storageOptions: { sequelize },
  migrations: {
    params: [sequelize.getQueryInterface(), sequelize.constructor],
    path: path.resolve(__dirname, '../migrations'),
    pattern: /\.js$/,
  },
});

// Log migration events
function logEvent(event) {
  return (name, migration) => console.log(`${name} ${event}`);
}
umzug.on('migrating', logEvent('migrating'));
umzug.on('migrated', logEvent('migrated'));

// Log the status of all migration scripts
function getMigrationStatus() {
  umzug
    .executed()
    .then(executed => {
      console.log('EXECUTED:', JSON.stringify(executed.map(e => e.file), null, 2));
      return umzug.pending();
    })
    .then(pending => {
      console.log('PENDING:', JSON.stringify(pending.map(p => p.file), null, 2));
    });
}

const cmd = (process.argv[2] || '').trim();

switch (cmd) {
  case 'status':
    getMigrationStatus();
    break;

  case 'up':
  case 'migrate':
    umzug.up();
    break;

  case 'down':
  case 'prev':
    umzug.down();
    break;

  default:
    console.log('Usage:\n    $ node ./tools/migrate.js <up | down | status>');
    process.exit(1);
}
