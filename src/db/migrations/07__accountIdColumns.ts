import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async function (query: QueryInterface, Sequelize: DataTypes) {
    await query.describeTable('LandRequest').then((table: any) => {
      if (table.triggererAccountId) return;
      return query.addColumn('LandRequest', 'triggererAccountId', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    });
    return query.describeTable('PullRequest').then((table: any) => {
      if (table.authorAccountId) return;
      return query.addColumn('PullRequest', 'authorAccountId', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    });
  },
  // VIOLATES FOREIGN KEY CONSTRAINT
  down: function () {
    throw new Error('NO DROP FUNCTION FOR THIS MIGRATION');
  },
};
