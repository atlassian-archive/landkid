import {
  Model,
  Table,
  Column,
  Sequelize,
  Default,
  PrimaryKey,
  AllowNull,
  HasMany,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import * as path from 'path';
import { config } from '../lib/Config';

@Table
export class Installation extends Model<Installation> {
  @PrimaryKey
  @Column(Sequelize.STRING)
  readonly id: string;

  @AllowNull(false)
  @Column(Sequelize.STRING)
  clientKey: string;

  @AllowNull(false)
  @Column(Sequelize.STRING)
  sharedSecret: string;
}

@Table
export class LandRequest extends Model<LandRequest> implements ILandRequest {
  @PrimaryKey
  @Default(Sequelize.UUIDV4)
  @Column(Sequelize.UUID)
  readonly id: string;

  @ForeignKey(() => PullRequest)
  @AllowNull(false)
  @Column(Sequelize.INTEGER)
  readonly pullRequestId: number;

  @AllowNull(false)
  @Column(Sequelize.STRING)
  readonly triggererAaid: string;

  @AllowNull(true)
  @Column(Sequelize.INTEGER)
  buildId: number | null;

  @AllowNull(false)
  @Column(Sequelize.STRING)
  readonly forCommit: string;

  @AllowNull(false)
  @Default(() => new Date())
  @Column(Sequelize.DATE)
  readonly created: Date;

  @HasMany(() => LandRequestStatus)
  statuses: LandRequestStatus[];

  @BelongsTo(() => PullRequest)
  pullRequest: PullRequest;

  getStatus = async () => {
    return await LandRequestStatus.findOne<LandRequestStatus>({
      where: {
        requestId: this.id,
        isLatest: true,
      },
      order: [['date', 'ASC']],
    });
  };

  setStatus = async (state: LandRequestStatus['state'], reason?: string) => {
    await this.sequelize.transaction(async t => {
      // First we'll check if there is an old status for this LandRequest
      await LandRequestStatus.update(
        {
          isLatest: false,
        },
        {
          where: {
            requestId: this.id,
          },
          transaction: t,
        },
      );

      await LandRequestStatus.create<LandRequestStatus>(
        {
          state,
          reason,
          requestId: this.id,
          isLatest: true,
        },
        { transaction: t },
      );
    });
  };
}

@Table
export class LandRequestStatus extends Model<LandRequestStatus> implements IStatusUpdate {
  @PrimaryKey
  @Default(Sequelize.UUIDV4)
  @Column(Sequelize.UUID)
  readonly id: string;

  @AllowNull(false)
  @Default(() => new Date())
  @Column(Sequelize.DATE)
  readonly date: Date;

  @AllowNull(true)
  @Column(Sequelize.STRING)
  readonly reason: string | null;

  @AllowNull(false)
  @Column(
    Sequelize.ENUM({
      values: [
        'will-queue-when-ready',
        'created',
        'queued',
        'running',
        'success',
        'fail',
        'aborted',
      ],
    }),
  )
  readonly state: IStatusUpdate['state'];

  @AllowNull(false)
  @Default(true)
  @Column(Sequelize.BOOLEAN)
  isLatest: boolean;

  @BelongsTo(() => LandRequest)
  request: LandRequest;

  @ForeignKey(() => LandRequest)
  requestId: string;
}

@Table
export class PullRequest extends Model<PullRequest> implements IPullRequest {
  @PrimaryKey
  @AllowNull(false)
  @Column(Sequelize.INTEGER)
  readonly prId: number;

  @AllowNull(false)
  @Column(Sequelize.STRING)
  readonly authorAaid: string;

  @AllowNull(false)
  @Column(Sequelize.STRING)
  title: string;

  @AllowNull(false)
  @Default('unknown')
  @Column(Sequelize.STRING)
  targetBranch: string;
}

@Table
export class Permission extends Model<Permission> implements IPermission {
  @Column(Sequelize.STRING)
  readonly aaid: string;

  @AllowNull(false)
  @Default('read')
  @Column(Sequelize.ENUM({ values: ['read', 'land', 'admin'] }))
  readonly mode: IPermissionMode;

  @AllowNull(false)
  @Default(() => new Date())
  @Column(Sequelize.DATE)
  readonly dateAssigned: Date;

  @AllowNull(true)
  @Column(Sequelize.STRING)
  readonly assignedByAaid: string;
}

@Table
export class UserNote extends Model<UserNote> implements IUserNote {
  @PrimaryKey
  @AllowNull(false)
  @Column(Sequelize.STRING)
  readonly aaid: string;

  @AllowNull(false)
  @Column(Sequelize.STRING)
  note: string;

  @AllowNull(false)
  @Column(Sequelize.STRING)
  setByAaid: string;
}

@Table
export class PauseStateTransition extends Model<PauseStateTransition> implements IPauseState {
  @PrimaryKey
  @Default(Sequelize.UUIDV4)
  @Column(Sequelize.UUID)
  id: string;

  @AllowNull(false)
  @Column(Sequelize.STRING)
  readonly pauserAaid: string;

  @AllowNull(false)
  @Column(Sequelize.BOOLEAN)
  readonly paused: boolean;

  @AllowNull(true)
  @Column(Sequelize.STRING({ length: 2000 }))
  readonly reason: string;

  @AllowNull(false)
  @Default(() => new Date())
  @Column(Sequelize.DATE)
  readonly date: Date;
}

@Table
export class MessageStateTransition extends Model<PauseStateTransition> implements IMessageState {
  @PrimaryKey
  @Default(Sequelize.UUIDV4)
  @Column(Sequelize.UUID)
  id: string;

  @AllowNull(false)
  @Column(Sequelize.STRING)
  readonly senderAaid: string;

  @AllowNull(false)
  @Column(Sequelize.BOOLEAN)
  readonly messageExists: boolean;

  @AllowNull(true)
  @Column(Sequelize.STRING({ length: 2000 }))
  readonly message: string;

  @AllowNull(true)
  @Column(
    Sequelize.ENUM({
      values: ['default', 'warning', 'error'],
    }),
  )
  readonly messageType: IMessageState['messageType'];

  @AllowNull(false)
  @Default(() => new Date())
  @Column(Sequelize.DATE)
  readonly date: Date;
}

export const initializeSequelize = async () => {
  const sequelize = new Sequelize(
    config.sequelize ||
      ({
        dialect: 'sqlite',
        storage: path.resolve(__dirname, '../../db.sqlite'),
        logging: false,
      } as any),
  );

  sequelize.addModels([
    Installation,
    PauseStateTransition,
    MessageStateTransition,
    Permission,
    UserNote,
    PullRequest,
    LandRequestStatus,
    LandRequest,
  ]);

  await sequelize.authenticate();
  await sequelize.sync();

  return sequelize;
};

export { MigrationService } from './MigrationService';
