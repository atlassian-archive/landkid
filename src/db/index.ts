import { Model, Table, Column, Sequelize, Default, PrimaryKey, AllowNull, HasMany, ForeignKey, BelongsTo } from 'sequelize-typescript';
import * as path from 'path';

@Table
export class LandRequest extends Model<LandRequest> implements ILandRequest {
  @PrimaryKey
  @Default(Sequelize.UUIDV4)
  @Column(Sequelize.UUID)
  readonly id: string;

  @ForeignKey(() => PullRequest)
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
      },
      order: [['date', 'ASC']],
    });
  }

  setStatus = async (state: LandRequestStatus['state'], reason?: string) => {
    return await LandRequestStatus.create<LandRequestStatus>({
      state,
      reason,
      requestId: this.id,
    });
  }
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
  @Column(Sequelize.ENUM({ values: ['will-queue-when-ready', 'created', 'queued', 'running', 'success', 'fail', 'aborted'] }))
  readonly state: IStatusUpdate['state'];

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
}

@Table
export class Permission extends Model<Permission> {
  @PrimaryKey
  @Column(Sequelize.STRING)
  readonly aaid: string;

  @AllowNull(false)
  @Default('read')
  @Column(Sequelize.ENUM({ values: ['read', 'land', 'admin'] }))
  readonly mode: 'read' | 'land' | 'admin';

  @AllowNull(false)
  @Default(() => new Date())
  @Column(Sequelize.DATE)
  readonly dateAssigned: Date;

  @AllowNull(false)
  @Column(Sequelize.STRING)
  readonly assignedByAaid: string;
};

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
};

export const initializeSequelize = async () => {
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.resolve(__dirname, '../../db.sqlite'),

    // TS plz
    // database: '',
    // name: '',
    // url: '',
  } as any);

  sequelize.addModels([
    PauseStateTransition,
    Permission,
    PullRequest,
    LandRequestStatus,
    LandRequest,
  ]);

  await sequelize.authenticate();
  await sequelize.sync();

  return sequelize;
};
