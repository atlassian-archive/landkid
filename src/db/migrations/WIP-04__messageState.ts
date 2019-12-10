import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: function(query: QueryInterface, Sequelize: DataTypes) {
    return query.dropTable('MessageStateTransition').then(() =>
      query.createTable('MessageState', {
        senderAaid: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        message: {
          type: Sequelize.STRING({ length: 2000 }),
          allowNull: false,
        },
        messageType: {
          type: Sequelize.ENUM({ values: ['default', 'warning', 'error'] }),
          allowNull: false,
        },
        date: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
      }),
    );
  },
  down: function(query: QueryInterface, Sequelize: DataTypes) {
    return query.dropTable('MessageState').then(() =>
      query.createTable('MessageStateTransition', {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        senderAaid: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        messageExists: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
        },
        message: {
          type: Sequelize.STRING({ length: 2000 }),
          allowNull: true,
        },
        messageType: {
          type: Sequelize.ENUM({ values: ['default', 'warning', 'error'] }),
          allowNull: true,
        },
        date: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
      }),
    );
  },
};
