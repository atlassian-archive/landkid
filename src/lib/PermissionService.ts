import { Permission, UserNote } from '../db';
import { config } from './Config';
import { Logger } from './Logger';

class PermissionService {
  getPermissionForUser = async (aaid: string): Promise<IPermissionMode> => {
    const permission = await Permission.findOne<Permission>({
      where: {
        aaid,
      },
      order: [['dateAssigned', 'DESC']],
    });

    if (!permission) {
      const defaultMode: IPermissionMode = config.landkidAdmins.includes(aaid) ? 'admin' : 'read';
      Logger.info('User does not exist, creating one', { defaultMode, aaid });
      await Permission.create({
        aaid,
        mode: defaultMode,
      });
      return defaultMode;
    }

    return permission.mode;
  };

  setPermissionForUser = async (
    aaid: string,
    mode: IPermissionMode,
    setter: ISessionUser,
  ): Promise<void> => {
    Logger.info('Setting user permission', { aaid, mode, setter });
    await Permission.create({
      aaid,
      mode,
      assignedByAaid: setter.aaid,
    });
  };

  getNotes = async (): Promise<IUserNote[]> => {
    return UserNote.findAll<UserNote>();
  };

  setNoteForUser = async (aaid: string, note: string, setter: ISessionUser): Promise<void> => {
    (await UserNote.update(
      {
        note,
        setByAaid: setter.aaid,
      },
      {
        where: {
          aaid,
        },
      },
    ))[0] > 0 || // Check if a row was updated, otherwise create a new row
      (await UserNote.create<UserNote>({
        aaid,
        note,
        setByAaid: setter.aaid,
      }));
  };

  removeUserNote = async (aaid: string): Promise<void> => {
    await UserNote.destroy({
      where: {
        aaid,
      },
    });
  };
}

export const permissionService = new PermissionService();
