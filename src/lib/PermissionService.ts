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

  getUsersPermissions = async (requestingUserMode: IPermissionMode): Promise<UserState[]> => {
    // TODO: Figure out how to use distinct
    const perms = await Permission.findAll<Permission>({
      order: [['dateAssigned', 'DESC']],
    });

    // Need to get only the latest record for each user
    const aaidPerms: Record<string, Permission> = {};
    for (const perm of perms) {
      if (
        !aaidPerms[perm.aaid] ||
        aaidPerms[perm.aaid].dateAssigned.getTime() < perm.dateAssigned.getTime()
      ) {
        aaidPerms[perm.aaid] = perm;
      }
    }

    const aaidNotes: Record<string, string> = {};
    if (requestingUserMode === 'admin') {
      const notes = await UserNote.findAll<UserNote>();
      for (const note of notes) {
        aaidNotes[note.aaid] = note.note;
      }
    }

    // Now we need to filter to only show the records that the requesting user is allowed to see
    const users: UserState[] = [];
    for (const aaid of Object.keys(aaidPerms)) {
      // admins see all users
      if (requestingUserMode === 'admin') {
        users.push({
          aaid,
          mode: aaidPerms[aaid].mode,
          dateAssigned: aaidPerms[aaid].dateAssigned,
          assignedByAaid: aaidPerms[aaid].assignedByAaid,
          note: aaidNotes[aaid],
        });
        // land users can see land and admin users
      } else if (requestingUserMode === 'land' && aaidPerms[aaid].mode !== 'read') {
        users.push(aaidPerms[aaid]);
        // read users can only see admins
      } else if (requestingUserMode === 'read' && aaidPerms[aaid].mode === 'admin') {
        users.push(aaidPerms[aaid]);
      }
    }

    return users;
  };
}

export const permissionService = new PermissionService();
