import { QueryInterface } from 'sequelize';

export default {
  up: function (query: QueryInterface) {
    return query.describeTable('LandRequest').then((table: any) => {
      if (table.mergeStrategy) return;
      return query.sequelize.query(
        'CREATE TYPE "enum_LandRequest_mergeStrategy" AS ENUM(\'squash\', \'merge-commit\'); ALTER TABLE "LandRequest" ADD COLUMN "mergeStrategy" "enum_LandRequest_mergeStrategy";',
      );
    });
  },
  down: function (query: QueryInterface) {
    return query.sequelize.query(
      'DROP TYPE "enum_LandRequest_mergeStrategy"; ALTER TABLE "LandRequest" DROP COLUMN "mergeStrategy";',
    );
  },
};
