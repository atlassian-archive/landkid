import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: function(query: QueryInterface, Sequelize: DataTypes) {
    return query.createTable('MessageStateTransition', {
      id: {
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      senderAaid: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      messageExists: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
      },
      message: {
        allowNull: true,
        type: Sequelize.STRING({ length: 2000 }),
      },
      messageType: {
        allowNull: true,
        type: Sequelize.ENUM('default', 'warning', 'error'),
      },
      date: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  down: function(query: QueryInterface, Sequelize: DataTypes) {
    return query.dropTable('MessageStateTransition');
  },
};
