import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: function(query: QueryInterface, Sequelize: DataTypes) {
    return query.describeTable('PullRequest').then((table: any) => {
      if (table.targetBranch) return;
      return query
        .addColumn('PullRequest', 'targetBranch', {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'unknown',
        })
        .then(() => {
          return query.sequelize.query(
            `UPDATE "PullRequest" SET "targetBranch"='unknown' WHERE "targetBranch" IS NULL;`,
            { raw: true },
          );
        });
    });
  },
  // VIOLATES FOREIGN KEY CONSTRAINT
  down: function(query: QueryInterface, Sequelize: DataTypes) {
    throw new Error('NO DROP FUNCTION FOR THIS MIGRATION');
  },
};
