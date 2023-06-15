import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async function (query: QueryInterface, Sequelize: DataTypes) {
    return query.addColumn('LandRequest', 'dependsOnPrIds', {
      type: Sequelize.STRING({ length: 1000 }), // set the maximum length to 1000
      allowNull: true,
    });
  },
  down: async function (query: QueryInterface, Sequelize: DataTypes) {
    return query.addColumn('LandRequest', 'dependsOnPrIds', {
      type: Sequelize.STRING(), // set the maximum length back to default 255
      allowNull: true,
    });
  },
};
