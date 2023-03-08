import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: function (query: QueryInterface, Sequelize: DataTypes) {
    return query.describeTable('LandRequest').then((table: any) => {
      if (table.impact) return;
      return query.addColumn('LandRequest', 'impact', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      });
    });
  },
  // VIOLATES FOREIGN KEY CONSTRAINT
  down: function () {
    throw new Error('NO DROP FUNCTION FOR THIS MIGRATION');
  },
};
