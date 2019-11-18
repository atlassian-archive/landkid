module.exports = {
  up: function(query, Sequelize) {
    return query
      .addColumn(
        'PullRequest', // Table to add column to
        'targetBranch', // Name of new column
        Sequelize.STRING,
        {
          allowNull: false,
          defaultValue: 'unknown',
        },
      )
      .then(() => {
        return query.sequelize.query(
          `UPDATE "PullRequest" SET "targetBranch"='unknown' WHERE "targetBranch" IS NULL;`,
          { raw: true },
        );
      });
  },
  // VIOLATES FOREIGN KEY CONSTRAINT
  down: function(query, Sequelize) {
    return query.removeColumn('PullRequest', 'targetBranch');
  },
};
