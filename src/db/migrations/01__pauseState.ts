import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: function(query: QueryInterface, Sequelize: DataTypes) {
    return query.dropTable('PauseStateTransition').then(() =>
      query.createTable('PauseState', {
        pauserAaid: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        reason: {
          type: Sequelize.STRING({ length: 2000 }),
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
  down: function(query: QueryInterface, Sequelize: DataTypes) {
    return query.dropTable('PauseState').then(() =>
      query.createTable('PauseStateTransition', {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        pauserAaid: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        paused: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
        },
        reason: {
          type: Sequelize.STRING({ length: 2000 }),
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
