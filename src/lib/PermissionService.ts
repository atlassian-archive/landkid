import { Permission } from '../db';
import { config } from './Config';

class PermissionService {
  getPermissionForUser = async (
    user: ISessionUser,
  ): Promise<IPermissionMode> => {
    const permission = await Permission.findOne<Permission>({
      where: {
        aaid: user.aaid,
      },
      order: [['dateAssigned', 'DESC']],
    });

    if (!permission) {
      const defaultMode: IPermissionMode = config.landkidAdmins.includes(
        user.aaid,
      )
        ? 'admin'
        : 'read';
      await Permission.create({
        aaid: user.aaid,
        mode: defaultMode,
      });
      return defaultMode;
    }

    return permission.mode;
  };
}

export const permissionService = new PermissionService();
