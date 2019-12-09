import { resolve } from 'path';
// import { Sequelize } from 'sequelize';
import * as Umzug from 'umzug';
// import { Config } from '../types';

export class MigrationService {
  migrator: Umzug.Umzug;

  constructor(sequelize: any) {
    this.migrator = new Umzug({
      storage: 'sequelize',
      storageOptions: { sequelize },
      migrations: {
        params: [sequelize.getQueryInterface(), sequelize.constructor],
        path: resolve(__dirname, 'migrations'),
        pattern: /^\d{2}__[^ /]+?\.js$/,
      },
    });
    this.migrator.on('migrating', this.logEvent('migrating'));
    this.migrator.on('migrated', this.logEvent('migrated'));
    this.migrator.on('reverting', this.logEvent('reverting'));
    this.migrator.on('reverted', this.logEvent('reverted'));
  }

  private logEvent(event: string) {
    return (name: string) => console.log(`${name} ${event}`);
  }

  async logStatus() {
    this.migrator
      .pending()
      .then(pending => {
        console.log('PENDING:', JSON.stringify(pending.map(p => p.file), null, 2));
        return this.migrator.executed();
      })
      .then(executed => {
        console.log('EXECUTED:', JSON.stringify(executed.map(e => e.file), null, 2));
      });
  }

  up() {
    return this.migrator.up();
  }

  down() {
    return this.migrator.down();
  }
}

if (require.main === module) {
  console.log('This script currently only works programmatically');
  // const config = require(resolve(process.cwd(), 'config.js')) as Config;

  // // Connect to DB
  // const sequelize = new Sequelize(
  //   config.sequelize || {
  //     dialect: 'sqlite',
  //     storage: resolve(__dirname, '../../db.sqlite'),
  //     logging: false,
  //     operatorsAliases: false,
  //   },
  // );

  // const migrator = new MigrationService(sequelize);

  // const cmd = (process.argv[2] || '').trim();

  // switch (cmd) {
  //   case 'status':
  //     migrator.logStatus();
  //     break;

  //   case 'up':
  //   case 'migrate':
  //     migrator.up();
  //     break;

  //   case 'down':
  //   case 'revert':
  //     migrator.down();
  //     break;

  //   default:
  //     console.log('Usage:\n    $ node ./tools/migrate.js <up | down | status>');
  //     process.exit(1);
  // }
}
