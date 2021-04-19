import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: function(query: QueryInterface, Sequelize: DataTypes) {
    return query.describeTable('PullRequest').then((table: any) => {
      if (table.sourceBranch) return;
      return query.addColumn('PullRequest', 'sourceBranch', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    });
  },
  // VIOLATES FOREIGN KEY CONSTRAINT
  down: function() {
    throw new Error('NO DROP FUNCTION FOR THIS MIGRATION');
  },
};
