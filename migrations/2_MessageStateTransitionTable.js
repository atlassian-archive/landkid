module.exports = {
  up: function(query, Sequelize) {
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
  // VIOLATES FOREIGN KEY CONSTRAINT
  down: function(query, Sequelize) {
    return query.dropTable('MessageStateTransition');
  },
};
