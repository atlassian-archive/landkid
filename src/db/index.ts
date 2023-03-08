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
  AfterCreate,
  Unique,
} from 'sequelize-typescript';
import path from 'path';
import { config } from '../lib/Config';
import { eventEmitter } from '../lib/Events';

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

  // The actual atlassian account ID - triggererAaid is actually the bitbucket UUID
  @AllowNull(true)
  @Column(Sequelize.STRING)
  readonly triggererAccountId: string;

  @AllowNull(true)
  @Column(Sequelize.INTEGER)
  buildId: number;

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

  @AllowNull(true)
  @Column(Sequelize.STRING)
  dependsOn: string;

  @AllowNull(true)
  @Default(0)
  @Column(Sequelize.INTEGER)
  priority: number;

  // Impact is used by the speculationEngine
  @AllowNull(true)
  @Default(0)
  @Column(Sequelize.INTEGER)
  impact: number;

  @AllowNull(true)
  @Column(
    Sequelize.ENUM({
      values: ['squash', 'merge-commit'],
    }),
  )
  mergeStrategy: IMergeStrategy;

  /* Reload the instance after creation so that we eagerly load associations
   * see https://github.com/sequelize/sequelize/issues/3807#issuecomment-438237173
   */
  @AfterCreate
  static reload(instance: LandRequest) {
    instance.reload();
  }

  getStatus = async () => {
    return LandRequestStatus.findOne<LandRequestStatus>({
      where: {
        requestId: this.id,
        isLatest: true,
      },
      order: [['date', 'ASC']],
    });
  };

  setStatus = async (state: LandRequestStatus['state'], reason?: string, date?: Date) => {
    const prevStatus = await this.getStatus();
    await this.sequelize.transaction(async (t) => {
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
          date: date || new Date(),
        },
        { transaction: t },
      );
    });
    const queuedDate = await this.getQueuedDate();
    eventEmitter.emit('LAND_REQUEST.STATUS.CHANGED', {
      landRequestId: this.id,
      pullRequestId: this.pullRequestId,
      buildId: this.buildId,
      author: this.pullRequest?.authorAccountId,
      triggerer: this.triggererAccountId,
      commit: this.forCommit,
      sourceBranch: this.pullRequest?.sourceBranch,
      targetBranch: this.pullRequest?.targetBranch,
      title: this.pullRequest?.title,
      state,
      reason,
      prevState: prevStatus?.state,
      stateDuration: prevStatus ? Date.now() - prevStatus.date.getTime() : null,
      durationSinceQueued: queuedDate ? Date.now() - queuedDate.getTime() : null,
      dependsOn: this.dependsOn,
    });
    return true;
  };

  getDependencies = async () => {
    const dependsOnStr = this.dependsOn;
    if (!dependsOnStr) return [];
    const dependsOnArr = dependsOnStr.split(',');
    const dependsOnLandRequests = await LandRequest.findAll({
      where: {
        id: dependsOnArr,
      },
      include: [
        {
          model: LandRequestStatus,
          where: {
            isLatest: true,
          },
        },
      ],
    });

    return dependsOnLandRequests;
  };

  getFailedDependencies = async () => {
    const dependsOnStr = this.dependsOn;
    if (!dependsOnStr) return [];
    const dependsOnArr = dependsOnStr.split(',');
    const failedDependencies = await LandRequestStatus.findAll({
      where: {
        isLatest: true,
        requestId: {
          $in: dependsOnArr,
        },
        state: {
          $in: ['fail', 'aborted', 'queued'],
        },
      },
      include: [LandRequest],
    });

    return failedDependencies;
  };

  updatePriority = (newPriority: number) => {
    this.priority = newPriority;
    return this.save();
  };

  incrementPriority = () => {
    return this.updatePriority(this.priority + 1);
  };

  decrementPriority = () => {
    return this.updatePriority(this.priority - 1);
  };

  getQueuedDate = async () => {
    const status = await LandRequestStatus.findOne<LandRequestStatus>({
      where: {
        requestId: this.id,
        state: 'queued',
      },
      order: [['date', 'ASC']],
    });
    return status ? status.date : null;
  };

  updateImpact = (impact: number) => {
    this.impact = impact;
    return this.save();
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
  readonly reason: string;

  @AllowNull(false)
  @Column(
    Sequelize.ENUM({
      values: [
        'will-queue-when-ready',
        'queued',
        'running',
        'awaiting-merge',
        'merging',
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

  // The actual atlassian account ID - authorAaid is actually the bitbucket UUID
  @AllowNull(true)
  @Column(Sequelize.STRING)
  readonly authorAccountId: string;

  @AllowNull(false)
  @Column(Sequelize.STRING)
  title: string;

  @AllowNull(true)
  @Column(Sequelize.STRING)
  sourceBranch: string;

  @AllowNull(true)
  @Column(Sequelize.STRING)
  targetBranch: string;
}

@Table
export class Permission extends Model<Permission> implements IPermission {
  @Column(Sequelize.STRING)
  readonly aaid: string;

  @AllowNull(false)
  @Default('land')
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
export class PauseState extends Model<PauseState> implements IPauseState {
  @PrimaryKey
  @AllowNull(false)
  @Column(Sequelize.STRING)
  readonly pauserAaid: string;

  @AllowNull(true)
  @Column(Sequelize.STRING({ length: 2000 }))
  readonly reason: string;

  @AllowNull(false)
  @Default(() => new Date())
  @Column(Sequelize.DATE)
  readonly date: Date;
}

@Table
export class BannerMessageState extends Model<BannerMessageState> implements IMessageState {
  @PrimaryKey
  @AllowNull(false)
  @Column(Sequelize.STRING)
  readonly senderAaid: string;

  @AllowNull(false)
  @Column(Sequelize.STRING({ length: 2000 }))
  readonly message: string;

  @AllowNull(false)
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

@Table
export class ConcurrentBuildState
  extends Model<ConcurrentBuildState>
  implements IConcurrentBuildState
{
  @PrimaryKey
  @Default(Sequelize.UUIDV4)
  @Column(Sequelize.UUID)
  readonly id: string;

  @AllowNull(false)
  @Column(Sequelize.STRING)
  readonly adminAaid: string;

  @AllowNull(false)
  @Column(Sequelize.INTEGER)
  readonly maxConcurrentBuilds: number;

  @AllowNull(false)
  @Default(() => new Date())
  @Column(Sequelize.DATE)
  readonly date: Date;
}

@Table
export class PriorityBranch extends Model<PriorityBranch> implements IPriorityBranch {
  @PrimaryKey
  @Default(Sequelize.UUIDV4)
  @Column(Sequelize.UUID)
  readonly id: string;

  @AllowNull(false)
  @Unique
  @Column(Sequelize.STRING)
  readonly branchName: string;

  @AllowNull(false)
  @Column(Sequelize.STRING)
  readonly adminAaid: string;

  @AllowNull(false)
  @Default(() => new Date())
  @Column(Sequelize.DATE)
  readonly date: Date;
}

@Table
export class AdminSettings extends Model<AdminSettings> implements IAdminSettings {
  @PrimaryKey
  @Default(Sequelize.UUIDV4)
  @Column(Sequelize.UUID)
  readonly id: string;

  /** Admin that made the change */
  @AllowNull(false)
  @Column(Sequelize.STRING)
  readonly adminAaid: string;

  @AllowNull(false)
  @Default(() => new Date())
  @Column(Sequelize.DATE)
  readonly date: Date;

  /** Live feature toggling of config.mergeSettings.mergeBlocking. Must be first enabled in config to be enabled here */
  @AllowNull(false)
  @Default(false)
  @Column(Sequelize.BOOLEAN)
  readonly mergeBlockingEnabled: boolean;

  /** Live feature toggling of config.speculationEngineEnabled. Must be first enabled in config to be enabled here */
  @AllowNull(false)
  @Default(false)
  @Column(Sequelize.BOOLEAN)
  readonly speculationEngineEnabled: boolean;
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
    PauseState,
    BannerMessageState,
    ConcurrentBuildState,
    PriorityBranch,
    Permission,
    UserNote,
    PullRequest,
    LandRequestStatus,
    LandRequest,
    AdminSettings,
  ]);

  await sequelize.authenticate();
  await sequelize.sync();

  return sequelize;
};

export { MigrationService } from './MigrationService';
