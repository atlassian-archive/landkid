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
      const defaultMode: IPermissionMode = config.landkidAdmins.includes(aaid) ? 'admin' : 'land';
      Logger.info('User does not exist, creating one', {
        namespace: 'lib:permissions:getPermissionForUser',
        defaultMode,
        aaid,
      });
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
    const noteExists = await UserNote.count<UserNote>({ where: { aaid } });
    if (noteExists) {
      await UserNote.update<UserNote>({ note, setByAaid: setter.aaid }, { where: { aaid } });
    } else {
      await UserNote.create<UserNote>({ aaid, note, setByAaid: setter.aaid });
    }
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
