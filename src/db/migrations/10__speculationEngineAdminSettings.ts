import { QueryInterface, DataTypes } from 'sequelize';

export default {
  async up(queryInterface: QueryInterface, Sequelize: DataTypes) {
    const table: any = await queryInterface.describeTable('AdminSettings');
    if (table.speculationEngineEnabled) return;
    return queryInterface.addColumn('AdminSettings', 'speculationEngineEnabled', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });
  },

  async down() {
    throw new Error('NO DROP FUNCTION FOR THIS MIGRATION');
  },
};
