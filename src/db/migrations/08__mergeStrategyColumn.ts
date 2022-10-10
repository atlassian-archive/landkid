import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: function (query: QueryInterface, Sequelize: DataTypes) {
    return query.describeTable('LandRequest').then((table: any) => {
      if (table.mergeStrategy) return;
      return query.addColumn('LandRequest', 'mergeStrategy', {
        type: Sequelize.ENUM({
          values: ['squash', 'merge-commit'],
        }),
        allowNull: true,
      });
    });
  },
  // VIOLATES FOREIGN KEY CONSTRAINT
  down: function () {
    throw new Error('NO DROP FUNCTION FOR THIS MIGRATION');
  },
};
