import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: function (query: QueryInterface, Sequelize: DataTypes) {
    return query.describeTable('LandRequest').then((table: any) => {
      if (table.priority) return;
      return query.addColumn('LandRequest', 'priority', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: true,
      });
    });
  },
  // VIOLATES FOREIGN KEY CONSTRAINT
  down: function () {
    throw new Error('NO DROP FUNCTION FOR THIS MIGRATION');
  },
};
