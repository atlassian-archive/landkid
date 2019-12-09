import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: function(query: QueryInterface, Sequelize: DataTypes) {
    return query.describeTable('LandRequestStatus').then((table: any) => {
      if (table.dependsOn) return;
      return query.addColumn('LandRequestStatus', 'dependsOn', {
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
